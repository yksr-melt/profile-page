import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NOT_FOUND_FILE } from '../server/routes.js'

// Cloudflare and link-preview bots (Discord, etc.) cache og-image.png under
// its plain URL, so a new image doesn't show up in existing/new link
// previews until the URL itself changes. Append a hash of the current file
// so every build gets a correct, automatic cache-busting query string.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const distDir = process.argv[2]
if (!distDir) {
  console.error('usage: node scripts/cache-bust-og-image.js <dist dir>')
  process.exit(1)
}

const routes = JSON.parse(readFileSync(path.join(root, 'src', 'data', 'routes.json'), 'utf-8'))
// Every prerendered page shares the same <head>, so the same og:image tag
// (and the same hash) appears in all of them.
const files = [...Object.values(routes), NOT_FOUND_FILE].map((p) =>
  p === '/' ? 'index.html' : p === NOT_FOUND_FILE ? p : `${p.slice(1)}/index.html`,
)

const imagePath = path.join(root, 'public', 'og-image.png')
const hash = createHash('md5').update(readFileSync(imagePath)).digest('hex').slice(0, 8)

for (const file of files) {
  const filePath = path.join(distDir, file)
  const html = readFileSync(filePath, 'utf-8')
  const updated = html.replace(/og-image\.png(\?v=[a-z0-9]+)?/g, `og-image.png?v=${hash}`)
  writeFileSync(filePath, updated)
}

console.log(`og-image.png cache-busted with hash ${hash} in ${files.length} files`)
