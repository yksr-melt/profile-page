import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { useServerStatus, type ServerStatus as Status } from '../hooks/useServerStatus'
import { useLang, type MessageKey } from '../i18n'

// Windows Task Manager's "Performance" view: a list of resources on the left,
// the selected one's usage graph on the right, and its details underneath.
// Colors never change with the value (a red "hot" state reads as "about to
// break" and relies on color alone), so it's numbers and graphs only.

type Resource = 'cpu' | 'memory'

const COLORS: Record<Resource, { line: string; fill: string; border: string }> = {
  cpu: { line: '#1189d0', fill: 'rgba(17, 137, 208, 0.12)', border: 'border-[#1189d0]/40' },
  memory: { line: '#8b12ae', fill: 'rgba(139, 18, 174, 0.10)', border: 'border-[#8b12ae]/40' },
}

const HISTORY_SIZE = 60

// Nulls (a sample the server couldn't take) break the line instead of being
// drawn as 0%, which would look like the machine had stopped.
function segments(values: (number | null)[]) {
  const padded = [...Array(Math.max(0, HISTORY_SIZE - values.length)).fill(null), ...values.slice(-HISTORY_SIZE)]
  const out: [number, number][][] = []
  let current: [number, number][] = []
  padded.forEach((v, i) => {
    if (v === null) {
      if (current.length) out.push(current)
      current = []
    } else {
      current.push([(i / (HISTORY_SIZE - 1)) * 100, 100 - v])
    }
  })
  if (current.length) out.push(current)
  return out
}

function Graph({ values, resource, grid = false }: { values: (number | null)[]; resource: Resource; grid?: boolean }) {
  const { line, fill } = COLORS[resource]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {grid &&
        Array.from({ length: 9 }).map((_, i) => (
          <g key={i} stroke={line} strokeOpacity={0.12} vectorEffect="non-scaling-stroke">
            <line x1={0} x2={100} y1={(i + 1) * 10} y2={(i + 1) * 10} vectorEffect="non-scaling-stroke" />
            <line y1={0} y2={100} x1={(i + 1) * 10} x2={(i + 1) * 10} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      {segments(values).map((points, i) => {
        const path = points.map(([x, y]) => `${x},${y}`).join(' ')
        const area = `${points[0][0]},100 ${path} ${points[points.length - 1][0]},100`
        return (
          <g key={i}>
            <polygon points={area} fill={fill} />
            <polyline points={path} fill="none" stroke={line} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </g>
        )
      })}
    </svg>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-ink-400">{label}</p>
      <p className="text-lg font-black text-ink-900 tabular-nums">{value}</p>
    </div>
  )
}

const TITLES: Record<Resource, MessageKey> = { cpu: 'server.cpu', memory: 'server.memory' }

export function ServerStatus() {
  const { t } = useLang()
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(false)
  const [selected, setSelected] = useState<Resource>('cpu')

  // Only poll while the panel is actually on screen.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { data, error } = useServerStatus(onScreen)
  const unavailable = t('server.unavailable')
  const pct = (v: number | null | undefined) => (typeof v === 'number' ? `${Math.round(v)}%` : unavailable)

  const summary = (resource: Resource, s: Status | null) =>
    resource === 'cpu'
      ? pct(s?.cpu)
      : s?.memory
        ? `${s.memory.usedGiB}/${s.memory.totalGiB} GB (${Math.round(s.memory.percent)}%)`
        : unavailable

  const history = (resource: Resource) => data?.history[resource] ?? []
  const showGraphs = !reduceMotion

  return (
    <div ref={ref} className="mt-8 rounded-3xl border border-ink-200/60 bg-white p-5 shadow-softer">
      <div className="mb-1 flex items-center gap-1.5">
        <Activity size={15} className="text-accent-400" />
        <h3 className="text-sm font-black text-ink-900">{t('server.title')}</h3>
      </div>
      <p className="mb-4 text-xs text-ink-400">{t('server.description')}</p>

      {!data && error && <p className="py-6 text-center text-xs text-ink-400">{unavailable}</p>}
      {!data && !error && <div className="h-64 animate-pulse rounded-2xl bg-ink-50" />}

      {data && (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Resource list (left column on wide screens, tabs on phones) */}
          <div role="tablist" className="flex gap-2 sm:w-40 sm:shrink-0 sm:flex-col">
            {(['cpu', 'memory'] as const).map((resource) => (
              <button
                key={resource}
                role="tab"
                aria-selected={selected === resource}
                onClick={() => setSelected(resource)}
                className={`flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition sm:flex-none ${
                  selected === resource ? `${COLORS[resource].border} bg-ink-50` : 'border-transparent'
                }`}
              >
                {showGraphs && (
                  <span className={`h-8 w-12 shrink-0 overflow-hidden rounded border ${COLORS[resource].border}`}>
                    <Graph values={history(resource)} resource={resource} />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-black text-ink-900">{t(TITLES[resource])}</span>
                  <span className="block truncate text-[10px] text-ink-500 tabular-nums">{summary(resource, data)}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Selected resource */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xl font-black text-ink-900">{t(TITLES[selected])}</p>
              {data.cores !== null && selected === 'cpu' && (
                <p className="text-[10px] font-bold text-ink-400">{t('server.cores', { n: data.cores })}</p>
              )}
              {data.memory && selected === 'memory' && (
                <p className="text-[10px] font-bold text-ink-400">{data.memory.totalGiB} GB</p>
              )}
            </div>

            {showGraphs && (
              <>
                <div className="flex justify-between text-[10px] text-ink-400">
                  <span>{t('server.usage')}</span>
                  <span>100%</span>
                </div>
                <div className={`h-36 border ${COLORS[selected].border}`}>
                  <Graph values={history(selected)} resource={selected} grid />
                </div>
                <div className="mb-3 flex justify-between text-[10px] text-ink-400">
                  <span>{t('server.seconds', { n: Math.round((HISTORY_SIZE * data.intervalMs) / 1000) })}</span>
                  <span>0</span>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-3">
              {selected === 'cpu' ? (
                <>
                  <Stat label={t('server.usageShort')} value={pct(data.cpu)} />
                  <Stat
                    label={t('server.temperature')}
                    value={data.temperature !== null ? `${data.temperature}°C` : unavailable}
                  />
                  <Stat
                    label={t('server.uptime')}
                    value={data.uptimeDays !== null ? t('server.days', { n: data.uptimeDays }) : unavailable}
                  />
                  <Stat label={t('server.load')} value={data.load ? data.load.join(' / ') : unavailable} />
                </>
              ) : (
                <>
                  <Stat label={t('server.inUse')} value={data.memory ? `${data.memory.usedGiB} GB` : unavailable} />
                  <Stat label={t('server.total')} value={data.memory ? `${data.memory.totalGiB} GB` : unavailable} />
                  <Stat label={t('server.usageShort')} value={pct(data.memory?.percent)} />
                </>
              )}
            </div>

            {error && <p className="mt-3 text-[10px] text-ink-400">{t('server.stale')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
