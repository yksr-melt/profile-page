import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

createApp().listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
  if (!fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    console.log('No dist/ build found — run `npm run build` to serve the frontend from this port too.')
  }
})
