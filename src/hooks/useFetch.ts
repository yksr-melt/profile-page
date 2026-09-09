import { useEffect, useState } from 'react'

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

// Multiple components on the same page (App, Home, ContributionGraph, ...)
// call useFetch with the same URL. Without sharing in-flight requests, each
// mount fires its own fetch — harmless server-side (responses are cached
// there too) but wasteful in the browser. This dedupes concurrent requests
// for the same URL and lets later mounts reuse an already-settled response.
const cache = new Map<string, { data: unknown; error: string | null }>()
const inFlight = new Map<string, Promise<unknown>>()

function load(url: string): Promise<unknown> {
  const pending = inFlight.get(url)
  if (pending) return pending

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed: ${res.status}`)
      }
      return res.json()
    })
    .then((data) => {
      cache.set(url, { data, error: null })
      return data
    })
    .catch((err) => {
      cache.set(url, { data: null, error: String(err.message || err) })
      throw err
    })
    .finally(() => {
      inFlight.delete(url)
    })

  inFlight.set(url, promise)
  return promise
}

export function useFetch<T>(url: string): FetchState<T> {
  const cached = cache.get(url)
  const [state, setState] = useState<FetchState<T>>({
    data: (cached?.data as T) ?? null,
    loading: !cached,
    error: cached?.error ?? null,
  })

  useEffect(() => {
    let cancelled = false
    const hit = cache.get(url)
    if (hit) {
      setState({ data: hit.data as T, loading: false, error: hit.error })
      return
    }

    setState({ data: null, loading: true, error: null })

    load(url)
      .then((data) => {
        if (!cancelled) setState({ data: data as T, loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: String(err.message || err) })
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return state
}
