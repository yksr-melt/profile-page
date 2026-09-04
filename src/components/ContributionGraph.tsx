import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGithubSummary, type ContributionDay } from '../hooks/useGithubSummary'

const levelColor: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-ink-100',
  1: 'bg-accent-100',
  2: 'bg-accent-300',
  3: 'bg-accent-400',
  4: 'bg-accent-500',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function ContributionGraph() {
  const { data, loading, error } = useGithubSummary()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ rect: DOMRect; day: ContributionDay } | null>(null)

  useLayoutEffect(() => {
    if (data && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [data])

  return (
    <div className="rounded-3xl border border-ink-200/60 bg-white p-5 shadow-softer">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-ink-700">
          Contributions
          {data && (
            <span className="ml-2 text-xs font-medium text-ink-400">
              {data.totalContributions.toLocaleString()} / year
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-ink-400">少</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={`h-2.5 w-2.5 rounded-[3px] ${levelColor[l]}`} />
          ))}
          <span className="text-[10px] text-ink-400">多</span>
        </div>
      </div>

      {error && <p className="py-6 text-center text-xs text-ink-400">GitHubの取得に失敗しました</p>}

      {loading && !error && (
        <div className="flex gap-[3px]">
          {Array.from({ length: 26 }).map((_, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, di) => (
                <span key={di} className="h-2.5 w-2.5 animate-pulse rounded-[3px] bg-ink-100" />
              ))}
            </div>
          ))}
        </div>
      )}

      {data && (
        <div ref={scrollRef} className="flex gap-[3px] overflow-x-auto no-scrollbar">
          {data.weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <span
                  key={di}
                  style={{ animationDelay: `${wi * 6 + di * 4}ms` }}
                  onMouseEnter={(e) => setHover({ rect: e.currentTarget.getBoundingClientRect(), day })}
                  onMouseLeave={() => setHover(null)}
                  className={`h-2.5 w-2.5 animate-cell-in rounded-[3px] ${levelColor[day.level]}`}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {hover &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] animate-tooltip-in whitespace-nowrap rounded-xl bg-ink-900 px-3 py-1.5 text-center shadow-soft"
            style={{ left: hover.rect.left + hover.rect.width / 2, top: hover.rect.top }}
          >
            <p className="text-xs font-bold text-white">{hover.day.count} contributions</p>
            <p className="text-[10px] text-ink-300">{formatDate(hover.day.date)}</p>
          </div>,
          document.body,
        )}
    </div>
  )
}
