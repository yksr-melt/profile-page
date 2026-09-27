import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './components/LanguageProvider'
import { tabFromPath } from './routes'

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <LanguageProvider>
      <App initialTab={tabFromPath(window.location.pathname)} />
    </LanguageProvider>
  </StrictMode>,
)
