import { useEffect, useLayoutEffect } from 'react'

// useLayoutEffect warns ("does nothing on the server") when it runs during
// server rendering; it never actually runs there either way (effects don't
// fire during renderToString), so swap in the no-op-during-SSR useEffect for
// that pass and keep the real thing in the browser.
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
