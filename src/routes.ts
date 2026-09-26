import routes from './data/routes.json'
import { TAB_ORDER, type Tab } from './types'

// The same file is read by the server (server/routes.js) to decide which
// paths get the SPA with 200 and which get the not-found page with 404.
export const TAB_PATHS: Record<Tab, string> = routes

export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

/** The tab for a URL path, or null when the path is not one of ours. */
export function tabFromPath(pathname: string): Tab | null {
  const normalized = normalizePath(pathname)
  return TAB_ORDER.find((tab) => TAB_PATHS[tab] === normalized) ?? null
}
