import { motion } from 'framer-motion'
import { Boxes, Music2, Home, User, Link2 } from 'lucide-react'
import type { Tab } from '../types'

const items: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'product', label: 'Product', icon: Boxes },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'me', label: 'Me', icon: User },
  { id: 'links', label: 'Links', icon: Link2 },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (tab: Tab) => void
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2 sm:pb-6"
      aria-label="Primary"
    >
      <div className="glass flex items-center gap-0.5 rounded-[28px] border border-white/60 px-1.5 py-1.5 shadow-soft sm:gap-1 sm:px-2">
        {items.map((item) => {
          const isActive = item.id === active
          const isHome = item.id === 'home'
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex flex-col items-center justify-center rounded-[22px] transition-colors ${
                isHome ? 'h-14 w-16 sm:h-16 sm:w-[4.5rem]' : 'h-14 w-14 sm:h-16 sm:w-16'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className={`absolute inset-0 rounded-[22px] ${
                    isHome
                      ? 'bg-gradient-to-br from-accent-400 to-accent-500'
                      : 'bg-accent-50'
                  }`}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative flex flex-col items-center gap-0.5">
                <Icon
                  size={isHome ? 22 : 19}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={
                    isActive
                      ? isHome
                        ? 'text-white'
                        : 'text-accent-500'
                      : 'text-ink-400'
                  }
                />
                <span
                  className={`text-[10px] font-bold leading-none ${
                    isActive
                      ? isHome
                        ? 'text-white'
                        : 'text-accent-500'
                      : 'text-ink-400'
                  }`}
                >
                  {item.label}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
