// Whether the app has been through its first client-side mount yet. A plain
// module-level flag, not React state: components read it directly during
// render (no hook, no re-render) to decide their framer-motion `initial`
// value — see the comment on `isHydrated` below.
let hydrated = false

export function markHydrated() {
  hydrated = true
}

/**
 * True once the app's very first mount (prerendered HTML being hydrated, or
 * a plain client render with no prerendered HTML) has happened.
 *
 * Every animated component's `initial` prop should be
 * `isHydrated() ? {...} : false` so that whatever was part of the *first*
 * paint (prerendered on the server, or otherwise) never starts invisible
 * (opacity: 0) waiting on JS to run the entrance animation — false makes it
 * render already at its `animate` resting state. framer-motion only reads
 * `initial` at mount, so this doesn't fight anything already on screen: a
 * component mounted before the flag flips keeps using `false` for its own
 * lifetime, and one mounted afterwards (e.g. a tab opened later, well after
 * the app is already interactive) reads `true` on its first render and gets
 * its entrance animation as normal.
 */
export function isHydrated() {
  return hydrated
}
