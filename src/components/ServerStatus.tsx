import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { useServerStatus, type ServerStatus as Status } from '../hooks/useServerStatus'
import { useLang, type MessageKey } from '../i18n'

// Windows Task Manager's "Performance" view: a list of resources on the left,
// the selected one's graph on the right, and its details underneath.
// Colors never change with the value (a red "hot" state reads as "about to
// break" and relies on color alone), so it's numbers and graphs only.

type Resource = 'cpu' | 'memory' | 'temperature' | 'load'

const RESOURCES: Resource[] = ['cpu', 'memory', 'temperature', 'load']

const COLORS: Record<Resource, { line: string; fill: string; border: string }> = {
  cpu: { line: '#1189d0', fill: 'rgba(17, 137, 208, 0.12)', border: 'border-[#1189d0]/40' },
  memory: { line: '#8b12ae', fill: 'rgba(139, 18, 174, 0.10)', border: 'border-[#8b12ae]/40' },
  temperature: { line: '#c2410c', fill: 'rgba(194, 65, 12, 0.10)', border: 'border-[#c2410c]/40' },
  load: { line: '#4d8a10', fill: 'rgba(77, 138, 16, 0.12)', border: 'border-[#4d8a10]/40' },
}

const TITLES: Record<Resource, MessageKey> = {
  cpu: 'server.cpu',
  memory: 'server.memory',
  temperature: 'server.temperature',
  load: 'server.load',
}

const HISTORY_SIZE = 60

// The value at the top of each graph. Temperature is fixed at 100°C; load
// average tops out at the core count (every core busy), which the axis label
// spells out so graphs of the same height aren't read as the same thing.
function graphMax(resource: Resource, s: Status) {
  if (resource === 'load') return s.cores || 1
  return 100
}

// Nulls (a sample the server couldn't take) break the line instead of being
// drawn as 0, which would look like the machine had stopped.
function segments(values: (number | null)[], max: number) {
  const padded = [...Array(Math.max(0, HISTORY_SIZE - values.length)).fill(null), ...values.slice(-HISTORY_SIZE)]
  const out: [number, number][][] = []
  let current: [number, number][] = []
  padded.forEach((v, i) => {
    if (v === null) {
      if (current.length) out.push(current)
      current = []
    } else {
      current.push([(i / (HISTORY_SIZE - 1)) * 100, 100 - Math.min(100, (v / max) * 100)])
    }
  })
  if (current.length) out.push(current)
  return out
}

function Graph({
  values,
  max,
  resource,
  grid = false,
}: {
  values: (number | null)[]
  max: number
  resource: Resource
  grid?: boolean
}) {
  const { line, fill } = COLORS[resource]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {grid &&
        Array.from({ length: 9 }).map((_, i) => (
          <g key={i} stroke={line} strokeOpacity={0.12}>
            <line x1={0} x2={100} y1={(i + 1) * 10} y2={(i + 1) * 10} vectorEffect="non-scaling-stroke" />
            <line y1={0} y2={100} x1={(i + 1) * 10} x2={(i + 1) * 10} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      {segments(values, max).map((points, i) => {
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
  const celsius = (v: number | null | undefined) => (typeof v === 'number' ? `${v}°C` : unavailable)
  const num = (v: number | null | undefined) => (typeof v === 'number' ? String(v) : unavailable)

  const summary = (resource: Resource, s: Status) => {
    switch (resource) {
      case 'cpu':
        return pct(s.cpu)
      case 'memory':
        return s.memory ? `${s.memory.usedGiB}/${s.memory.totalGiB} GB (${Math.round(s.memory.percent)}%)` : unavailable
      case 'temperature':
        return celsius(s.temperature)
      case 'load':
        return num(s.load?.[0])
    }
  }

  // The label at the top of the graph's scale.
  const topLabel = (resource: Resource, s: Status) => {
    switch (resource) {
      case 'temperature':
        return '100°C'
      case 'load':
        return t('server.loadMax', { n: graphMax('load', s) })
      default:
        return '100%'
    }
  }

  const graphLabel: Record<Resource, MessageKey> = {
    cpu: 'server.usage',
    memory: 'server.usage',
    temperature: 'server.temperature',
    load: 'server.load1',
  }

  const showGraphs = !reduceMotion

  return (
    <div ref={ref} className="mb-4 rounded-3xl border border-ink-200/60 bg-white p-5 shadow-softer">
      <div className="mb-1 flex items-center gap-1.5">
        <Activity size={15} className="text-accent-400" />
        <h3 className="text-sm font-black text-ink-900">{t('server.title')}</h3>
      </div>
      <p className="mb-4 text-xs text-ink-400">{t('server.description')}</p>

      {!data && error && <p className="py-6 text-center text-xs text-ink-400">{unavailable}</p>}
      {!data && !error && <div className="h-64 animate-pulse rounded-2xl bg-ink-50" />}

      {data && (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Resource list (left column on wide screens, a 2x2 grid on phones) */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-44 sm:shrink-0 sm:flex-col">
            {RESOURCES.map((resource) => (
              <button
                key={resource}
                aria-pressed={selected === resource}
                onClick={() => setSelected(resource)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                  selected === resource ? `${COLORS[resource].border} bg-ink-50` : 'border-transparent'
                }`}
              >
                {showGraphs && (
                  <span className={`h-8 w-12 shrink-0 overflow-hidden rounded border ${COLORS[resource].border}`}>
                    <Graph values={data.history[resource] ?? []} max={graphMax(resource, data)} resource={resource} />
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
              {data.cores !== null && (selected === 'cpu' || selected === 'load') && (
                <p className="text-[10px] font-bold text-ink-400">{t('server.cores', { n: data.cores })}</p>
              )}
              {data.memory && selected === 'memory' && (
                <p className="text-[10px] font-bold text-ink-400">{data.memory.totalGiB} GB</p>
              )}
            </div>

            {showGraphs && (
              <>
                <div className="flex justify-between text-[10px] text-ink-400">
                  <span>{t(graphLabel[selected])}</span>
                  <span>{topLabel(selected, data)}</span>
                </div>
                <div className={`h-36 border ${COLORS[selected].border}`}>
                  <Graph
                    values={data.history[selected] ?? []}
                    max={graphMax(selected, data)}
                    resource={selected}
                    grid
                  />
                </div>
                <div className="mb-3 flex justify-between text-[10px] text-ink-400">
                  <span>{t('server.seconds', { n: Math.round((HISTORY_SIZE * data.intervalMs) / 1000) })}</span>
                  <span>0</span>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-3">
              {selected === 'cpu' && (
                <>
                  <Stat label={t('server.usageShort')} value={pct(data.cpu)} />
                  <Stat
                    label={t('server.uptime')}
                    value={data.uptimeDays !== null ? t('server.days', { n: data.uptimeDays }) : unavailable}
                  />
                  <Stat label={t('server.coresLabel')} value={num(data.cores)} />
                </>
              )}
              {selected === 'memory' && (
                <>
                  <Stat label={t('server.inUse')} value={data.memory ? `${data.memory.usedGiB} GB` : unavailable} />
                  <Stat label={t('server.total')} value={data.memory ? `${data.memory.totalGiB} GB` : unavailable} />
                  <Stat label={t('server.usageShort')} value={pct(data.memory?.percent)} />
                </>
              )}
              {selected === 'temperature' && <Stat label={t('server.current')} value={celsius(data.temperature)} />}
              {selected === 'load' && (
                <>
                  <Stat label={t('server.load1')} value={num(data.load?.[0])} />
                  <Stat label={t('server.load5')} value={num(data.load?.[1])} />
                  <Stat label={t('server.load15')} value={num(data.load?.[2])} />
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
