import { useEffect, useState } from 'react'

export type ServerStatus = {
  intervalMs: number
  cpu: number | null
  memory: { totalGiB: number; usedGiB: number; percent: number } | null
  temperature: number | null
  uptimeDays: number | null
  load: number[] | null
  cores: number | null
  history: { cpu: (number | null)[]; memory: (number | null)[] }
}

const DEFAULT_INTERVAL_MS = 2000
const MAX_BACKOFF_MS = 30 * 1000

/**
 * Polls /api/status while `active` (the panel is on screen) and the browser
 * tab is visible. useFetch isn't used on purpose: it reuses the first
 * successful response, and this data has to keep moving. Failures keep the
 * last data on screen and back off instead of hammering the server.
 */
export function useServerStatus(active: boolean) {
  const [data, setData] = useState<ServerStatus | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!active) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = DEFAULT_INTERVAL_MS
    let controller: AbortController | undefined

    const schedule = () => {
      clearTimeout(timer)
      if (!cancelled && document.visibilityState === 'visible') timer = setTimeout(poll, delay)
    }

    const poll = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const res = await fetch('/api/status', { signal: controller.signal, cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const next = (await res.json()) as ServerStatus
        if (cancelled) return
        setData(next)
        setError(false)
        delay = next.intervalMs || DEFAULT_INTERVAL_MS
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
        setError(true)
        delay = Math.min(delay * 2, MAX_BACKOFF_MS)
      }
      schedule()
    }

    // Stop while the browser tab is hidden; pick up again when it's back.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') poll()
      else clearTimeout(timer)
    }

    poll()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active])

  return { data, error }
}
