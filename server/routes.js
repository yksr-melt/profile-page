import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Tab paths are shared with the frontend (src/routes.ts) so both sides agree
// on which URLs exist.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROUTES_FILE = path.join(__dirname, '..', 'src', 'data', 'routes.json')

const APP_PATHS = new Set(Object.values(JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf-8'))))

export function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/'
}

export function isAppPath(pathname) {
  return APP_PATHS.has(normalizePath(pathname))
}
