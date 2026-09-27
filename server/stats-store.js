import fs from 'node:fs'
import path from 'node:path'

/** Same write pattern as cache.js's last-good store: temp file + rename. */
export function createStatsStore(file) {
  function read() {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      return { visits: 0 }
    }
  }

  let writing = Promise.resolve()

  function write(stats) {
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

  return { read, write }
}
