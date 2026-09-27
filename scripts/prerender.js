import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { NOT_FOUND_FILE } from '../server/routes.js'

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

const { render } = await import(pathToFileURL(path.resolve(ssrEntry)).href)

function write(relFile, html) {
  const dest = path.join(distDir, relFile)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, template.replace(ROOT_PLACEHOLDER, `<div id="root">${html}</div>`))
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
