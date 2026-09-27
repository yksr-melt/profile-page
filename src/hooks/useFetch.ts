import { useEffect, useState } from 'react'

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

// Multiple components on the same page (App, Home, ContributionGraph, ...)
// call useFetch with the same URL. Requests for the same URL are shared, and
// a successful response is reused by later mounts. Failures are never cached:
// they are retried with backoff, and retried once more when the tab comes
// back into view.
const MAX_RETRIES = 4
const REFRESH_RETRIES = 2
const BASE_DELAY_MS = 1000

// The server embeds the last known GitHub/Last.fm responses in the page, so
// the Home page can draw at once instead of waiting a round trip for them.
// That data may be old: it is shown right away and refreshed in the background.
function readInitialData(): Record<string, unknown> {
  try {
    const text = document.getElementById('initial-data')?.textContent
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

const cache = new Map<string, unknown>(Object.entries(readInitialData()))
// URLs whose cached value came from the page and hasn't been refreshed yet.
const unrefreshed = new Set(cache.keys())
const failed = new Set<string>()
const inFlight = new Map<string, Promise<unknown>>()

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Exponential backoff (1s, 2s, 4s, 8s) with jitter, so tabs that failed
// together don't all retry at the same moment when the server comes back.
function retryDelay(attempt: number): number {
  const base = BASE_DELAY_MS * 2 ** attempt
  return base / 2 + Math.random() * (base / 2)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Retries pause while the tab is hidden and resume once it is visible.
function whenVisible(): Promise<void> {
  if (document.visibilityState !== 'hidden') return Promise.resolve()
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState === 'hidden') return
      document.removeEventListener('visibilitychange', onChange)
      resolve()
    }
    document.addEventListener('visibilitychange', onChange)
  })
}

async function fetchWithRetry(url: string, retries: number): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchJson(url)
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(retryDelay(attempt))
      await whenVisible()
    }
  }
}

function load(url: string, retries: number): Promise<unknown> {
  const pending = inFlight.get(url)
  if (pending) return pending

  const promise = fetchWithRetry(url, retries)
    .then((data) => {
      cache.set(url, data)
      unrefreshed.delete(url)
      failed.delete(url)
      return data
    })
    .catch((err) => {
      failed.add(url)
      throw err
    })
    .finally(() => {
      inFlight.delete(url)
    })

  inFlight.set(url, promise)
  return promise
}

export function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>(() => ({
    data: (cache.get(url) as T) ?? null,
    loading: !cache.has(url),
    error: null,
  }))

  useEffect(() => {
    let cancelled = false

    const run = (retries: number) => {
      load(url, retries).then(
        (data) => {
          if (!cancelled) setState({ data: data as T, loading: false, error: null })
        },
        (err) => {
          // Keep whatever was already on screen rather than blanking it, and
          // only report an error when there is nothing to show.
          if (!cancelled) {
            setState((prev) => ({ data: prev.data, loading: false, error: prev.data ? null : String(err.message || err) }))
          }
        },
      )
    }

    if (!cache.has(url)) run(MAX_RETRIES)
    else if (unrefreshed.has(url)) run(REFRESH_RETRIES)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && failed.has(url)) run(0)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [url])

  return state
}
