import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './components/LanguageProvider'
import { tabFromPath } from './routes'
import { LinkCard } from './pages/LinkCard'

const root = document.getElementById('root')!

// scripts/prerender.js marks the link.ibutya.com page with data-page="link";
// the HTML, not the hostname, decides, so it hydrates the same markup it was
// rendered with whichever host serves it.
hydrateRoot(
  root,
  <StrictMode>
    <LanguageProvider>
      {root.dataset.page === 'link' ? <LinkCard /> : <App initialTab={tabFromPath(window.location.pathname)} />}
    </LanguageProvider>
  </StrictMode>,
)
