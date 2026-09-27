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
// data can appear without a round trip after the JS loads. Every route is
// prerendered (scripts/prerender.js) with no data available at build time —
// the server only adds this script when it responds, so what's baked into
// the static HTML is always the loading skeleton. Reading this at mount
// (inside an effect, not at module load) means the very first client render
// still matches that skeleton — no hydration mismatch — and the embedded
// data, if present, replaces it a tick later without a network request.
function readInitialData(): Record<string, unknown> {
  try {
    const text = document.getElementById('initial-data')?.textContent
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

let initialDataRead = false
const cache = new Map<string, unknown>()
// URLs whose cached value came from the page and hasn't been refreshed yet.
const unrefreshed = new Set<string>()
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

    const apply = (data: unknown) => {
      if (!cancelled) setState({ data: data as T, loading: false, error: null })
    }
    const fail = (err: unknown) => {
      // Keep whatever was already on screen rather than blanking it, and
      // only report an error when there is nothing to show.
      if (!cancelled) {
        const message = err instanceof Error ? err.message : String(err)
        setState((prev) => ({ data: prev.data, loading: false, error: prev.data ? null : message }))
      }
    }
    const run = (retries: number) => load(url, retries).then(apply, fail)

    // Done once, on the very first effect to run anywhere — after the first
    // commit, so it can't affect what any component's first render showed.
    if (!initialDataRead) {
      initialDataRead = true
      for (const [dataUrl, value] of Object.entries(readInitialData())) {
        if (!cache.has(dataUrl)) {
          cache.set(dataUrl, value)
          unrefreshed.add(dataUrl)
        }
      }
    }

    if (cache.has(url)) {
      // Resolved as a microtask rather than read straight into state here,
      // so this is never a synchronous setState from inside the effect body.
      Promise.resolve(cache.get(url)).then(apply)
      if (unrefreshed.has(url)) run(REFRESH_RETRIES)
    } else {
      run(MAX_RETRIES)
    }

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
