import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createRateLimiter } from '../rate-limit.js'

function call(middleware, ip) {
  return new Promise((resolve) => {
    const req = { socket: { remoteAddress: ip }, headers: {} }
    const res = {
      headers: {},
      set(k, v) {
        this.headers[k] = v
      },
      status(code) {
        this.statusCode = code
        return this
      },
      json(body) {
        resolve({ status: this.statusCode ?? 200, body, headers: this.headers })
      },
    }
    middleware(req, res, () => resolve({ status: 200, headers: res.headers, passed: true }))
  })
}

describe('createRateLimiter', () => {
  test('allows up to `max` requests per window, then 429s with Retry-After', async () => {
    let t = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 3, now: () => t })
    try {
      for (let i = 0; i < 3; i++) assert.equal((await call(limiter, '1.1.1.1')).passed, true)
      const blocked = await call(limiter, '1.1.1.1')
      assert.equal(blocked.status, 429)
      assert.deepEqual(blocked.body, { error: 'too_many_requests' })
      assert.equal(blocked.headers['Retry-After'], '1')
    } finally {
      limiter.stop()
    }
  })

  test('each IP has its own budget', async () => {
    let t = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t })
    try {
      assert.equal((await call(limiter, '1.1.1.1')).passed, true)
      assert.equal((await call(limiter, '2.2.2.2')).passed, true)
      assert.equal((await call(limiter, '1.1.1.1')).status, 429)
    } finally {
      limiter.stop()
    }
  })

  test('the budget renews in the next window', async () => {
    let t = 0
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t })
    try {
      assert.equal((await call(limiter, '1.1.1.1')).passed, true)
      assert.equal((await call(limiter, '1.1.1.1')).status, 429)
      t = 1000
      assert.equal((await call(limiter, '1.1.1.1')).passed, true)
    } finally {
      limiter.stop()
    }
  })
})
