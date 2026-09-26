import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { useGithubSummary } from './hooks/useGithubSummary'
import { useLastfmDashboard } from './hooks/useLastfmDashboard'
import { useAppReady } from './hooks/useAppReady'
import { TAB_ORDER, type Tab } from './types'
import { TAB_PATHS, normalizePath, tabFromPath } from './routes'

// Home is the landing tab, so it loads eagerly with the rest of the app.
// The other tabs only matter once the user navigates to them, so they're
// split into their own chunks and fetched on demand.
const Product = lazy(() => import('./pages/Product').then((m) => ({ default: m.Product })))
const Music = lazy(() => import('./pages/Music').then((m) => ({ default: m.Music })))
const Me = lazy(() => import('./pages/Me').then((m) => ({ default: m.Me })))
const Links = lazy(() => import('./pages/Links').then((m) => ({ default: m.Links })))

// If the APIs are slow/unreachable, don't leave the splash up forever.
const DATA_WAIT_TIMEOUT_MS = 6000

const pages: Record<Tab, React.ComponentType<{ onNavigate: (tab: Tab) => void }>> = {
  product: Product,
  music: Music,
  home: Home,
  me: Me,
  links: Links,
}

// Not-found shares Home's slot for the slide direction.
function tabIndex(tab: Tab | null) {
  return TAB_ORDER.indexOf(tab ?? 'home')
}

function App() {
  // null means the URL isn't one of our tabs; the server has already answered
  // it with a 404, and we show the not-found page.
  const [tab, setTab] = useState<Tab | null>(() => tabFromPath(window.location.pathname))
  const prevIndex = useRef(tabIndex(tab))
  const { loading: githubLoading } = useGithubSummary()
  const { loading: lastfmLoading } = useLastfmDashboard()
  const fontsReady = useAppReady()

  const [dataTimedOut, setDataTimedOut] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setDataTimedOut(true), DATA_WAIT_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [])

  const dataReady = (!githubLoading && !lastfmLoading) || dataTimedOut
  const appReady = fontsReady && dataReady

  useEffect(() => {
    if (!appReady) return
    const loader = document.getElementById('app-loader')
    if (!loader) return
    loader.classList.add('is-hidden')
    const timeout = setTimeout(() => loader.remove(), 400)
    return () => clearTimeout(timeout)
  }, [appReady])

  // Once the app is up, use idle time to fetch the other tabs' chunks in the
  // background. Keeps the initial bundle small (they're still code-split)
  // while avoiding a chunk-download-and-parse stall the first time someone
  // taps a tab — which shows up as a bad INP on slower devices.
  useEffect(() => {
    if (!appReady) return
    const prefetch = () => {
      import('./pages/Product')
      import('./pages/Music')
      import('./pages/Me')
      import('./pages/Links')
    }
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch)
      return () => cancelIdleCallback(id)
    }
    const timeout = setTimeout(prefetch, 1000)
    return () => clearTimeout(timeout)
  }, [appReady])

  // Drop a trailing slash (/music/ -> /music) so each tab has one URL.
  useEffect(() => {
    const { pathname, search, hash } = window.location
    if (tab && pathname !== normalizePath(pathname)) {
      window.history.replaceState(null, '', normalizePath(pathname) + search + hash)
    }
  }, [tab])

  // Browser back/forward: follow the URL.
  useEffect(() => {
    const onPopState = () => {
      const next = tabFromPath(window.location.pathname)
      setTab((current) => {
        prevIndex.current = tabIndex(current)
        return next
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const index = tabIndex(tab)
  const direction = index > prevIndex.current ? 1 : index < prevIndex.current ? -1 : 0

  const handleChange = (next: Tab) => {
    if (next === tab) return
    prevIndex.current = tabIndex(tab)
    setTab(next)
    window.history.pushState(null, '', TAB_PATHS[next])
  }

  const Page = tab ? pages[tab] : NotFound

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,var(--color-accent-100),transparent_45%),radial-gradient(circle_at_100%_20%,var(--color-accent-50),transparent_40%)]" />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.main
          key={tab ?? 'not-found'}
          custom={direction}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-dvh pb-32"
        >
          <Suspense fallback={null}>
            <Page onNavigate={handleChange} />
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <BottomNav active={tab} onChange={handleChange} />
    </div>
  )
}

export default App
