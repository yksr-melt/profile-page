import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function SectionHeader({
  eyebrow,
  title,
  onMore,
  icon,
}: {
  eyebrow: string
  title: string
  onMore?: () => void
  icon?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="text-xs font-bold tracking-widest text-accent-500 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 flex items-center gap-1.5 text-xl font-black text-ink-900">
          {icon}
          {title}
        </h2>
      </div>
      {onMore && (
        <button
          onClick={onMore}
          className="flex items-center gap-0.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-500 shadow-softer transition active:scale-95"
        >
          もっと見る
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
