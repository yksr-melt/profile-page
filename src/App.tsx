import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { Product } from './pages/Product'
import { Music } from './pages/Music'
import { Me } from './pages/Me'
import { Links } from './pages/Links'
import { NotFound } from './pages/NotFound'
import { useGithubSummary } from './hooks/useGithubSummary'
import { useLastfmDashboard } from './hooks/useLastfmDashboard'
import { isHydrated, markHydrated } from './hydration'
import { TAB_ORDER, type Tab } from './types'
import { TAB_PATHS, normalizePath, tabFromPath } from './routes'

// Every page is prerendered (scripts/prerender.js), so none of them can be
// React.lazy() — a lazy import hasn't resolved yet at hydration time, and
// hydrating into its Suspense fallback would throw away the prerendered
// markup for whichever tab was requested. They're all small enough
// (a few KB each) that this isn't a meaningful bundle-size cost.
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

function App({ initialTab }: { initialTab: Tab | null }) {
  const [tab, setTab] = useState<Tab | null>(initialTab)
  const prevIndex = useRef(tabIndex(tab))
  // Fetched up front so the data is there whichever tab is open; the
  // sections that use it draw a same-size skeleton until it arrives, rather
  // than the whole app waiting on it (there's no splash to hold up: the
  // page is already visible, prerendered).
  useGithubSummary()
  useLastfmDashboard()

  useEffect(() => {
    markHydrated()
  }, [])

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
          initial={isHydrated() ? { opacity: 0, x: direction * 24 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-dvh pb-32"
        >
          <Page onNavigate={handleChange} />
        </motion.main>
      </AnimatePresence>

      <BottomNav active={tab} onChange={handleChange} />
    </div>
  )
}

export default App
