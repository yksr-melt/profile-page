import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/BottomNav'
import { Home } from './pages/Home'
import { Product } from './pages/Product'
import { Music } from './pages/Music'
import { Me } from './pages/Me'
import { Links } from './pages/Links'
import { useGithubSummary } from './hooks/useGithubSummary'
import { useLastfmDashboard } from './hooks/useLastfmDashboard'
import { useDynamicFavicon } from './hooks/useDynamicFavicon'
import { useAppReady } from './hooks/useAppReady'
import { TAB_ORDER, type Tab } from './types'

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
  const { data: github, loading: githubLoading } = useGithubSummary()
  const { loading: lastfmLoading } = useLastfmDashboard()
  useDynamicFavicon(github?.profile.avatarUrl)
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
          <Page onNavigate={handleChange} />
        </motion.main>
      </AnimatePresence>

      <BottomNav active={tab} onChange={handleChange} />
    </div>
  )
}

export default App
