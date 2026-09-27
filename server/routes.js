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

export const NOT_FOUND_FILE = '404.html'

/**
 * The prerendered file (scripts/prerender.js) for a URL path, relative to
 * dist/ — 'index.html' for '/', '<name>/index.html' for the other tabs, or
 * null when the path isn't one of ours (the caller should serve
 * NOT_FOUND_FILE with a 404 status instead).
 */
export function fileForPath(pathname) {
  const normalized = normalizePath(pathname)
  if (!APP_PATHS.has(normalized)) return null
  return normalized === '/' ? 'index.html' : `${normalized.slice(1)}/index.html`
}
