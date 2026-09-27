import { trustedClientIp } from './request-ip.js'

/**
 * A simple fixed-window request limiter, keyed by IP (server/request-ip.js).
 * Counts live in memory only — restarting the server resets everyone, which
 * is fine for what this defends against (a script hammering /api/*).
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  now = Date.now,
  keyFor = trustedClientIp,
  skip,
} = {}) {
  const hits = new Map()

  // Without this, an IP that's never seen again keeps its entry forever.
  const sweep = setInterval(() => {
    const t = now()
    for (const [key, entry] of hits) {
      if (entry.resetAt <= t) hits.delete(key)
    }
  }, windowMs)
  sweep.unref?.()

  function middleware(req, res, next) {
    if (skip?.(req)) return next()
    const key = keyFor(req) ?? 'unknown'
    const t = now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs }
      hits.set(key, entry)
    }
    entry.count++
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - t) / 1000)))
      return res.status(429).json({ error: 'too_many_requests' })
    }
    next()
  }

  middleware.stop = () => clearInterval(sweep)
  return middleware
}
