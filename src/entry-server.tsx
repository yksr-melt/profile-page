import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'
import { LanguageProvider } from './components/LanguageProvider'
import { tabFromPath } from './routes'

/**
 * Renders one route to an HTML string, for scripts/prerender.js. Always in
 * Japanese (LanguageProvider defaults to 'ja' — see its comment) and with
 * framer-motion's entrance animations suppressed (src/hydration.ts), so the
 * output never starts invisible (opacity: 0) waiting on JS to run.
 */
export function render(path: string): { html: string; notFound: boolean } {
  const tab = tabFromPath(path)
  const html = renderToString(
    <StrictMode>
      <LanguageProvider>
        <App initialTab={tab} />
      </LanguageProvider>
    </StrictMode>,
  )
  return { html, notFound: tab === null }
}
