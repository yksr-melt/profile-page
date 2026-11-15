import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { LINK_CARD_FILE, NOT_FOUND_FILE } from '../server/routes.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const distDir = process.argv[2]
const ssrEntry = process.argv[3]
if (!distDir || !ssrEntry) {
  console.error('usage: node scripts/prerender.js <dist dir> <ssr entry .js>')
  process.exit(1)
}

const routes = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'routes.json'), 'utf-8'))

const templatePath = path.join(distDir, 'index.html')
const template = fs.readFileSync(templatePath, 'utf-8')
const ROOT_PLACEHOLDER = '<div id="root"></div>'
if (!template.includes(ROOT_PLACEHOLDER)) {
  throw new Error(`prerender: expected exactly ${JSON.stringify(ROOT_PLACEHOLDER)} in ${templatePath}`)
}

const { render, renderLinkCard } = await import(pathToFileURL(path.resolve(ssrEntry)).href)

function write(relFile, html, { rootAttrs = '', head = template } = {}) {
  const dest = path.join(distDir, relFile)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, head.replace(ROOT_PLACEHOLDER, `<div id="root"${rootAttrs}>${html}</div>`))
  console.log(`prerender: wrote ${relFile}`)
}

for (const [tab, routePath] of Object.entries(routes)) {
  const { html, notFound } = render(routePath)
  if (notFound) throw new Error(`prerender: "${routePath}" (tab "${tab}", from src/data/routes.json) did not resolve to a tab`)
  write(routePath === '/' ? 'index.html' : `${routePath.slice(1)}/index.html`, html)
}

// Any path not in routes.json resolves the same way — this one is just
// guaranteed not to collide with a real route.
const probe = render('/\u0000not-a-real-route')
if (!probe.notFound) throw new Error('prerender: expected the not-found probe path to not resolve to a tab')
write(NOT_FOUND_FILE, probe.html)

// The link.ibutya.com page. data-page tells src/main.tsx which component to
// hydrate it with.
// Its own title, URL and preview image (public/og-link.png, made by
// tools/make-og-link.mjs), so a shared link.ibutya.com doesn't look like the
// main site.
const LINK_TITLE = 'ibutya | Links'
const LINK_DESCRIPTION = 'ゆきしろの各種SNS・連絡先へのリンク集。'
function linkCardHead(html) {
  const replaced = html
    .replace(/(<title>|"og:title" content="|"twitter:title" content=")[^<"]*/g, `$1${LINK_TITLE}`)
    .replace(/("description" content="|"og:description" content="|"twitter:description" content=")[^"]*/g, `$1${LINK_DESCRIPTION}`)
    .replace('"og:url" content="https://ibutya.com"', '"og:url" content="https://link.ibutya.com"')
    .replaceAll('https://ibutya.com/og-image.png', 'https://link.ibutya.com/og-link.png')
  if (replaced.includes('og-image.png') || !replaced.includes(LINK_TITLE)) {
    throw new Error('prerender: index.html <head> no longer matches what linkCardHead() expects')
  }
  return replaced
}
write(LINK_CARD_FILE, renderLinkCard(), { rootAttrs: ' data-page="link"', head: linkCardHead(template) })
