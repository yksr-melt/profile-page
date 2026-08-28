import { useEffect, useState } from 'react'

const FONT_TIMEOUT_MS = 1500

/**
 * Resolves once the web font has finished loading (or a timeout elapses) and
 * two frames have painted, so callers can safely reveal layout-sensitive UI
 * without a visible reflow when the fallback font swaps for the real one.
 */
export function useAppReady() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fontsReady =
      'fonts' in document
        ? Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
          ])
        : Promise.resolve()

    fontsReady.then(() => {
      if (cancelled) return
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true)
        })
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return ready
}
