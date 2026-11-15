import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

// Every prerendered page names one of these preview images.
const htmlFiles = readdirSync(distDir, { recursive: true }).filter((f) => f.endsWith('.html'))

for (const image of ['og-image.png', 'og-link.png']) {
  const hash = createHash('md5').update(readFileSync(path.join(root, 'public', image))).digest('hex').slice(0, 8)
  const pattern = new RegExp(`${image.replace('.', '\\.')}(\\?v=[a-z0-9]+)?`, 'g')
  for (const file of htmlFiles) {
    const filePath = path.join(distDir, file)
    writeFileSync(filePath, readFileSync(filePath, 'utf-8').replace(pattern, `${image}?v=${hash}`))
  }
  console.log(`${image} cache-busted with hash ${hash} in ${htmlFiles.length} files`)
}
