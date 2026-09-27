import crypto from 'node:crypto'

function isoDate(now) {
  return new Date(now()).toISOString().slice(0, 10)
}

/**
 * Counts a visit once per calendar day (UTC) per visitor. Visitors are
 * de-duplicated by a salted hash of their IP (never the IP itself), kept only
 * in memory: the salt is replaced and the set forgotten at day rollover, and
 * neither survives a restart. IPv4 addresses are few enough to brute-force,
 * so the salt is what keeps a hash from being turned back into an IP.
 */
export function createVisitCounter({ store, now = Date.now }) {
  let day = isoDate(now)
  let salt = crypto.randomBytes(16).toString('hex')
  let seen = new Set()

  function rollToToday() {
    const d = isoDate(now)
    if (d !== day) {
      day = d
      salt = crypto.randomBytes(16).toString('hex')
      seen = new Set()
    }
  }

  function hash(ip) {
    return crypto.createHash('sha256').update(salt).update(ip).digest('hex')
  }

  return {
    read: () => store.read(),
    // Records a visit for `ip` if it hasn't already counted today. Returns
    // the stats either way, so a repeat visitor still gets the current total.
    record(ip) {
      rollToToday()
      if (!ip || seen.has(hash(ip))) return store.read()
      seen.add(hash(ip))
      return store.update((stats) => ({ ...stats, visits: (stats.visits || 0) + 1 }))
    },
  }
}
