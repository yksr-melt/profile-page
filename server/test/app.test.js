import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { createApp } from '../app.js'
import { NOT_FOUND_FILE, fileForPath, isAppPath } from '../routes.js'

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'profile-page-test-'))
}

// A dist/ shaped like scripts/prerender.js actually produces: one HTML file
// per tab plus 404.html, each with its own marker text so a test can tell
// which one it got.
function makeDist(distDir) {
  fs.mkdirSync(distDir, { recursive: true })
  const pages = { '': 'home', product: 'product', music: 'music', me: 'me', links: 'links' }
  for (const [dir, marker] of Object.entries(pages)) {
    const file = dir ? path.join(distDir, dir, 'index.html') : path.join(distDir, 'index.html')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `<!doctype html><title>${marker}</title><div id="root"></div>`)
  }
  fs.writeFileSync(path.join(distDir, NOT_FOUND_FILE), '<!doctype html><title>404</title>')
  fs.mkdirSync(path.join(distDir, 'assets'))
  fs.writeFileSync(path.join(distDir, 'assets', 'app.js'), 'console.log(1)')
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }
}

// A source whose upstream result is controlled by the test.
function fakeSource(ttlMs = 60 * 1000) {
  const source = {
    result: { ok: true },
    calls: 0,
    configured: () => true,
    ttlMs,
    fetch: async () => {
      source.calls++
      if (source.result instanceof Error) throw source.result
      return source.result
    },
  }
  return source
}

function sourcesWith(source) {
  return { 'github:summary': source, 'github:repos': source, 'lastfm:dashboard': source }
}

describe('isAppPath', () => {
  test('accepts tab paths, with or without a trailing slash', () => {
    for (const p of ['/', '/product', '/music', '/me', '/links', '/music/']) assert.ok(isAppPath(p), p)
  })

  test('rejects everything else', () => {
    for (const p of ['/typo', '/Music', '/me/extra', '/index.htm', '/api']) assert.ok(!isAppPath(p), p)
  })
})

describe('fileForPath', () => {
  test('maps each tab path to its prerendered file', () => {
    assert.equal(fileForPath('/'), 'index.html')
    assert.equal(fileForPath('/product'), 'product/index.html')
    assert.equal(fileForPath('/music/'), 'music/index.html')
    assert.equal(fileForPath('/me'), 'me/index.html')
    assert.equal(fileForPath('/links'), 'links/index.html')
  })

  test('null for anything not a tab path', () => {
    for (const p of ['/typo', '/me/extra', '/Product']) assert.equal(fileForPath(p), null, p)
  })
})

describe('routing', () => {
  let site
  // Under a hidden directory on purpose: send() refuses dotfile paths unless
  // the file is resolved relative to `root`.
  const distDir = path.join(tempDir(), '.checkout', 'dist')

  before(async () => {
    makeDist(distDir)
    site = await listen(createApp({ distDir, dataDir: tempDir(), sources: sourcesWith(fakeSource()) }))
  })
  after(() => site.close())

  test('each tab path gets its own prerendered page, with 200, no trailing-slash redirect', async () => {
    const expected = { '/': 'home', '/product': 'product', '/music/': 'music', '/me': 'me', '/links': 'links' }
    for (const [p, title] of Object.entries(expected)) {
      const res = await fetch(p === '/' ? site.url : site.url + p, { redirect: 'manual' })
      assert.equal(res.status, 200, p)
      assert.match(await res.text(), new RegExp(`<title>${title}</title>`), p)
    }
  })

  test('unknown paths get the not-found page, with 404', async () => {
    for (const p of ['/typo', '/me/extra']) {
      const res = await fetch(site.url + p)
      assert.equal(res.status, 404, p)
      assert.match(res.headers.get('content-type'), /text\/html/, p)
      assert.match(await res.text(), /<title>404<\/title>/, p)
    }
  })

  test('static files are served, missing assets are a plain 404', async () => {
    assert.equal((await fetch(site.url + '/assets/app.js')).status, 200)
    const res = await fetch(site.url + '/assets/missing.js')
    assert.equal(res.status, 404)
    assert.doesNotMatch(await res.text(), /<title>/)
  })

  test('unknown API paths are a JSON 404, not a page', async () => {
    const res = await fetch(site.url + '/api/nope')
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { error: 'not_found' })
  })
})

describe('/api/stats/visits', () => {
  test('counts a new IP once per day; the IP itself never appears in the response', async () => {
    const dataDir = tempDir()
    const site = await listen(createApp({ distDir: tempDir(), dataDir, sources: sourcesWith(fakeSource()) }))
    try {
      const headers = { 'CF-Connecting-IP': '203.0.113.5' }
      let res = await fetch(site.url + '/api/stats/visits', { method: 'POST', headers })
      assert.deepEqual(await res.json(), { visits: 1 })
      res = await fetch(site.url + '/api/stats/visits', { method: 'POST', headers })
      const body = await res.json()
      assert.deepEqual(body, { visits: 1 })
      assert.ok(!JSON.stringify(body).includes('203.0.113.5'))
    } finally {
      site.close()
    }
  })

  test('GET just reads the count, without counting a visit', async () => {
    const dataDir = tempDir()
    const site = await listen(createApp({ distDir: tempDir(), dataDir, sources: sourcesWith(fakeSource()) }))
    try {
      assert.deepEqual(await (await fetch(site.url + '/api/stats/visits')).json(), { visits: 0 })
    } finally {
      site.close()
    }
  })

  test('20 different IPs posting at once are all counted (no lost updates)', async () => {
    const dataDir = tempDir()
    const site = await listen(
      createApp({ distDir: tempDir(), dataDir, sources: sourcesWith(fakeSource()), rateLimit: { max: 100 } }),
    )
    try {
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          fetch(site.url + '/api/stats/visits', { method: 'POST', headers: { 'CF-Connecting-IP': `203.0.113.${i}` } }),
        ),
      )
      assert.deepEqual(await (await fetch(site.url + '/api/stats/visits')).json(), { visits: 20 })
    } finally {
      site.close()
    }
  })
})

describe('rate limiting', () => {
  test('/api/status has its own, looser budget: two tabs polling it are not throttled by /api\'s general one', async () => {
    const dataDir = tempDir()
    const site = await listen(
      createApp({
        distDir: tempDir(),
        dataDir,
        sources: sourcesWith(fakeSource()),
        status: { read: () => ({ ok: true }) },
        rateLimit: { max: 5 },
      }),
    )
    try {
      const headers = { 'CF-Connecting-IP': '198.51.100.9' }
      // Well past the general /api budget (5), well within status's own.
      for (let i = 0; i < 10; i++) {
        assert.equal((await fetch(site.url + '/api/status', { headers })).status, 200)
      }
      // The general budget is still enforced for everything else.
      for (let i = 0; i < 5; i++) await fetch(site.url + '/api/stats/visits', { headers })
      assert.equal((await fetch(site.url + '/api/stats/visits', { headers })).status, 429)
    } finally {
      site.close()
    }
  })


  test('an IP over the /api budget gets 429s; other endpoints and other IPs are unaffected', async () => {
    const dataDir = tempDir()
    const site = await listen(
      createApp({
        distDir: path.join(tempDir(), 'no-dist'),
        dataDir,
        sources: sourcesWith(fakeSource()),
        rateLimit: { windowMs: 60 * 1000, max: 3 },
      }),
    )
    try {
      const headers = { 'CF-Connecting-IP': '198.51.100.1' }
      for (let i = 0; i < 3; i++) {
        assert.equal((await fetch(site.url + '/api/stats/visits', { headers })).status, 200)
      }
      const blocked = await fetch(site.url + '/api/github/summary', { headers })
      assert.equal(blocked.status, 429)
      assert.deepEqual(await blocked.json(), { error: 'too_many_requests' })
      assert.ok(blocked.headers.get('retry-after'))

      const otherIp = await fetch(site.url + '/api/stats/visits', { headers: { 'CF-Connecting-IP': '198.51.100.2' } })
      assert.equal(otherIp.status, 200)

      // The limiter only guards /api; a request to the (non-existent) page itself is unaffected.
      assert.equal((await fetch(site.url + '/typo', { headers })).status, 404)
    } finally {
      site.close()
    }
  })
})

describe('upstream failures', () => {
  test('first-ever failure returns only a generic error', async () => {
    const source = fakeSource()
    source.result = new Error('secret upstream detail')
    const site = await listen(createApp({ distDir: tempDir(), dataDir: tempDir(), sources: sourcesWith(source) }))
    try {
      const res = await fetch(site.url + '/api/github/summary')
      assert.equal(res.status, 502)
      const text = await res.text()
      assert.deepEqual(JSON.parse(text), { error: 'upstream_unavailable' })
      assert.ok(!text.includes('secret'))
    } finally {
      site.close()
    }
  })

  test('unconfigured source returns only a generic error', async () => {
    const source = { ...fakeSource(), configured: () => false }
    const site = await listen(createApp({ distDir: tempDir(), dataDir: tempDir(), sources: sourcesWith(source) }))
    try {
      const res = await fetch(site.url + '/api/lastfm/dashboard')
      assert.equal(res.status, 503)
      assert.deepEqual(await res.json(), { error: 'upstream_unavailable' })
    } finally {
      site.close()
    }
  })

  test('after a success, a failure serves the last good data as stale', async () => {
    let clock = 0
    const source = fakeSource(1000)
    const site = await listen(
      createApp({ distDir: tempDir(), dataDir: tempDir(), sources: sourcesWith(source), now: () => clock }),
    )
    try {
      source.result = { n: 1 }
      let res = await fetch(site.url + '/api/github/summary')
      assert.deepEqual(await res.json(), { n: 1 })
      assert.equal(res.headers.get('x-data-stale'), null)

      clock += 2000 // past the TTL
      source.result = new Error('down')
      res = await fetch(site.url + '/api/github/summary')
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { n: 1 })
      assert.equal(res.headers.get('x-data-stale'), '1')

      // While stale, the upstream is not hit on every request.
      const calls = source.calls
      await fetch(site.url + '/api/github/summary')
      assert.equal(source.calls, calls)

      clock += 61 * 1000 // past the retry window, upstream is back
      source.result = { n: 2 }
      res = await fetch(site.url + '/api/github/summary')
      assert.deepEqual(await res.json(), { n: 2 })
      assert.equal(res.headers.get('x-data-stale'), null)
    } finally {
      site.close()
    }
  })

  test('last good data survives a restart', async () => {
    const dataDir = tempDir()
    const source = fakeSource()
    source.result = { saved: true }
    let site = await listen(createApp({ distDir: tempDir(), dataDir, sources: sourcesWith(source) }))
    await fetch(site.url + '/api/lastfm/dashboard')
    site.close()

    // Saved atomically: the file is complete JSON and no temp file is left.
    await new Promise((resolve) => setTimeout(resolve, 50))
    const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'last-good.json'), 'utf-8'))
    assert.deepEqual(saved['lastfm:dashboard'], { saved: true })
    assert.ok(!fs.existsSync(path.join(dataDir, 'last-good.json.tmp')))

    source.result = new Error('down')
    site = await listen(createApp({ distDir: tempDir(), dataDir, sources: sourcesWith(source) }))
    try {
      const res = await fetch(site.url + '/api/lastfm/dashboard')
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { saved: true })
      assert.equal(res.headers.get('x-data-stale'), '1')
    } finally {
      site.close()
    }
  })

  test('a corrupt saved file is ignored, not fatal', async () => {
    const dataDir = tempDir()
    fs.writeFileSync(path.join(dataDir, 'last-good.json'), '{"broken')
    const source = fakeSource()
    source.result = new Error('down')
    const site = await listen(createApp({ distDir: tempDir(), dataDir, sources: sourcesWith(source) }))
    try {
      assert.equal((await fetch(site.url + '/api/github/repos')).status, 502)
    } finally {
      site.close()
    }
  })
})
