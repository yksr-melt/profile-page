import fs from 'node:fs'
import path from 'node:path'

/**
 * The last successful response for each upstream endpoint, kept on disk so a
 * GitHub/Last.fm outage (or a restart during one) still has something to show.
 */
export function createLastGoodStore(file) {
  const values = new Map()

  try {
    for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf-8')))) {
      values.set(key, value)
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[cache] ignoring unreadable ${file}: ${err.message}`)
  }

  // Writes are chained so two quick successes can't race on the temp file.
  let writing = Promise.resolve()

  function persist() {
    writing = writing
      .then(async () => {
        const tmp = `${file}.tmp`
        await fs.promises.mkdir(path.dirname(file), { recursive: true })
        await fs.promises.writeFile(tmp, JSON.stringify(Object.fromEntries(values)))
        // rename() replaces the file atomically, so a power cut mid-write
        // leaves either the old file or the new one, never a half-written one.
        await fs.promises.rename(tmp, file)
      })
      .catch((err) => console.error(`[cache] failed to save ${file}: ${err.message}`))
    return writing
  }

  return {
    get: (key) => values.get(key),
    set(key, value) {
      values.set(key, value)
      return persist()
    },
  }
}

/**
 * In-memory response cache with a last-known-good fallback. Concurrent callers
 * share one upstream request. When the upstream fails and an older value
 * exists, that value is served (stale) and the upstream is left alone for
 * `retryAfterMs` instead of being hit on every request.
 */
export function createCache({ lastGood, now = Date.now, retryAfterMs = 60 * 1000 }) {
  const entries = new Map()

  return async function cached(key, ttlMs, fn) {
    const hit = entries.get(key)
    if (hit?.pending) return hit.pending
    if (hit && hit.expires > now()) return { value: hit.value, stale: hit.stale }

    const pending = fn().then(
      (value) => {
        entries.set(key, { value, stale: false, expires: now() + ttlMs })
        lastGood.set(key, value)
        return { value, stale: false }
      },
      (err) => {
        const fallback = lastGood.get(key)
        if (fallback === undefined) {
          entries.delete(key)
          throw err
        }
        console.error(`[${key}] upstream failed, serving last good data: ${err.message}`)
        entries.set(key, { value: fallback, stale: true, expires: now() + retryAfterMs })
        return { value: fallback, stale: true }
      },
    )
    entries.set(key, { pending })
    return pending
  }
}
