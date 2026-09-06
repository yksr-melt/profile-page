import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Cloudflare and link-preview bots (Discord, etc.) cache og-image.png under
// its plain URL, so a new image doesn't show up in existing/new link
// previews until the URL itself changes. Append a hash of the current file
// so every build gets a correct, automatic cache-busting query string.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const imagePath = path.join(root, 'public', 'og-image.png')
const indexPath = path.join(root, 'dist', 'index.html')

const hash = createHash('md5').update(readFileSync(imagePath)).digest('hex').slice(0, 8)

const html = readFileSync(indexPath, 'utf-8')
const updated = html.replace(/og-image\.png(\?v=[a-z0-9]+)?/g, `og-image.png?v=${hash}`)
writeFileSync(indexPath, updated)

console.log(`og-image.png cache-busted with hash ${hash}`)
