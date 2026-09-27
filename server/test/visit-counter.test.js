import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createVisitCounter } from '../visit-counter.js'

// A store whose update() is synchronous, matching stats-store.js's real
// contract: the in-memory value changes before any await, so it can't miss
// a concurrent update. (Modelling it as async-but-racy here would just
// reintroduce the bug these tests exist to catch.)
function memoryStore(initial = { visits: 0 }) {
  let stats = initial
  return {
    read: () => ({ ...stats }),
    update: (fn) => (stats = fn(stats)),
  }
}

describe('createVisitCounter', () => {
  test('counts a new IP, and does not count the same IP again the same day', () => {
    const counter = createVisitCounter({ store: memoryStore(), now: () => Date.parse('2026-01-01T00:00:00Z') })
    assert.equal(counter.record('203.0.113.1').visits, 1)
    assert.equal(counter.record('203.0.113.1').visits, 1)
    assert.equal(counter.record('203.0.113.2').visits, 2)
  })

  test('counts the same IP again on a new UTC day', () => {
    let t = Date.parse('2026-01-01T23:59:00Z')
    const counter = createVisitCounter({ store: memoryStore(), now: () => t })
    assert.equal(counter.record('203.0.113.1').visits, 1)
    t = Date.parse('2026-01-02T00:01:00Z')
    assert.equal(counter.record('203.0.113.1').visits, 2)
  })

  test('a missing IP (e.g. no CF header and a non-local socket) is not counted, but still returns the stats', () => {
    const store = memoryStore({ visits: 7 })
    const counter = createVisitCounter({ store, now: () => Date.now() })
    assert.equal(counter.record(null).visits, 7)
  })

  test('the IP itself is never stored', () => {
    let written = null
    const store = { read: () => ({ visits: 0 }), update: (fn) => (written = fn({ visits: 0 })) }
    const counter = createVisitCounter({ store, now: () => Date.now() })
    counter.record('203.0.113.1')
    assert.ok(!JSON.stringify(written).includes('203.0.113.1'))
  })

  test('20 different IPs recorded back-to-back (nothing awaited in between) all count', () => {
    const counter = createVisitCounter({ store: memoryStore({ visits: 100 }), now: () => Date.now() })
    for (let i = 0; i < 20; i++) counter.record(`203.0.113.${i}`)
    assert.equal(counter.read().visits, 120)
  })
})
