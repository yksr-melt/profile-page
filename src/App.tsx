import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { useGithubSummary } from './hooks/useGithubSummary'
import { useLastfmDashboard } from './hooks/useLastfmDashboard'
import { useAppReady } from './hooks/useAppReady'
import { TAB_ORDER, type Tab } from './types'

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

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const prevIndex = useRef(TAB_ORDER.indexOf('home'))
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

  const index = TAB_ORDER.indexOf(tab)
  const direction = index > prevIndex.current ? 1 : index < prevIndex.current ? -1 : 0

  const handleChange = (next: Tab) => {
    prevIndex.current = TAB_ORDER.indexOf(tab)
    setTab(next)
  }

  const Page = pages[tab]

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,var(--color-accent-100),transparent_45%),radial-gradient(circle_at_100%_20%,var(--color-accent-50),transparent_40%)]" />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.main
          key={tab}
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
