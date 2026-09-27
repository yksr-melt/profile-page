import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createVisitCounter } from '../visit-counter.js'

function memoryStore(initial = { visits: 0 }) {
  let stats = initial
  return {
    read: () => ({ ...stats }),
    write: async (next) => {
      stats = next
    },
  }
}

describe('createVisitCounter', () => {
  test('counts a new IP, and does not count the same IP again the same day', async () => {
    const counter = createVisitCounter({ store: memoryStore(), now: () => Date.parse('2026-01-01T00:00:00Z') })
    assert.equal((await counter.record('203.0.113.1')).visits, 1)
    assert.equal((await counter.record('203.0.113.1')).visits, 1)
    assert.equal((await counter.record('203.0.113.2')).visits, 2)
  })

  test('counts the same IP again on a new UTC day', async () => {
    let t = Date.parse('2026-01-01T23:59:00Z')
    const counter = createVisitCounter({ store: memoryStore(), now: () => t })
    assert.equal((await counter.record('203.0.113.1')).visits, 1)
    t = Date.parse('2026-01-02T00:01:00Z')
    assert.equal((await counter.record('203.0.113.1')).visits, 2)
  })

  test('a missing IP (e.g. no CF header and a non-local socket) is not counted, but still returns the stats', async () => {
    const store = memoryStore({ visits: 7 })
    const counter = createVisitCounter({ store, now: () => Date.now() })
    assert.equal((await counter.record(null)).visits, 7)
  })

  test('the IP itself is never stored', async () => {
    let written = null
    const store = { read: () => ({ visits: 0 }), write: async (s) => (written = s) }
    const counter = createVisitCounter({ store, now: () => Date.now() })
    await counter.record('203.0.113.1')
    assert.ok(!JSON.stringify(written).includes('203.0.113.1'))
  })
})
