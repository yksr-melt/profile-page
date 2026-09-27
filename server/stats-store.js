import fs from 'node:fs'
import path from 'node:path'

/**
 * Holds the stats in memory (read from disk once, at creation) and persists
 * every change with a temp-file + rename. Keeping the current value in
 * memory — rather than re-reading the file before each change — is what
 * makes `update()` safe for concurrent callers: see its docstring.
 */
export function createStatsStore(file) {
  let current
  // Only a corrupt (not missing) file stops persisting: overwriting it would
  // throw away whatever count was already saved.
  let readOnly = false

  try {
    current = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (err) {
    if (err.code === 'ENOENT') {
      current = { visits: 0 }
    } else {
      readOnly = true
      current = { visits: 0 }
      console.error(`[stats] ${file} is unreadable, starting read-only (not overwriting it): ${err.message}`)
    }
  }

  let writing = Promise.resolve()

  function persist(stats) {
    writing = writing
      .then(async () => {
        const tmp = `${file}.tmp`
        await fs.promises.mkdir(path.dirname(file), { recursive: true })
        await fs.promises.writeFile(tmp, JSON.stringify(stats))
        await fs.promises.rename(tmp, file)
      })
      .catch((err) => console.error(`[stats] failed to save ${file}: ${err.message}`))
    return writing
  }

  return {
    read: () => ({ ...current }),
    // Lets tests wait for the write behind the latest update() to land,
    // instead of guessing at a delay.
    flush: () => writing,
    /**
     * Applies `fn` to the in-memory value and persists the result. Because
     * `current` is updated synchronously — not re-read from disk — two
     * `update()` calls that arrive before either write reaches disk still
     * each see the other's change: there's nothing `await`ed between
     * reading `current` and replacing it, so no interleaving is possible.
     * A no-op (returning the unchanged value) while read-only.
     */
    update(fn) {
      if (readOnly) return { ...current }
      current = fn(current)
      persist(current)
      return { ...current }
    },
  }
}
