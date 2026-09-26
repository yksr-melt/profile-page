import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { createApp } from '../app.js'
import { isAppPath } from '../routes.js'

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'profile-page-test-'))
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

describe('routing', () => {
  let site
  // Under a hidden directory on purpose: send() refuses dotfile paths unless
  // the file is resolved relative to `root`.
  const distDir = path.join(tempDir(), '.checkout', 'dist')

  before(async () => {
    fs.mkdirSync(distDir, { recursive: true })
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>spa</title>')
    fs.mkdirSync(path.join(distDir, 'assets'))
    fs.writeFileSync(path.join(distDir, 'assets', 'app.js'), 'console.log(1)')
    site = await listen(createApp({ distDir, dataDir: tempDir(), sources: sourcesWith(fakeSource()) }))
  })
  after(() => site.close())

  test('tab paths get the SPA with 200', async () => {
    for (const p of ['/', '/music', '/me/', '/links']) {
      const res = await fetch(site.url + p)
      assert.equal(res.status, 200, p)
      assert.match(await res.text(), /<title>spa<\/title>/, p)
    }
  })

  test('unknown paths get the SPA with 404', async () => {
    for (const p of ['/typo', '/me/extra']) {
      const res = await fetch(site.url + p)
      assert.equal(res.status, 404, p)
      assert.match(res.headers.get('content-type'), /text\/html/, p)
      assert.match(await res.text(), /<title>spa<\/title>/, p)
    }
  })

  test('static files are served, missing assets are a plain 404', async () => {
    assert.equal((await fetch(site.url + '/assets/app.js')).status, 200)
    const res = await fetch(site.url + '/assets/missing.js')
    assert.equal(res.status, 404)
    assert.doesNotMatch(await res.text(), /<title>spa<\/title>/)
  })

  test('unknown API paths are a JSON 404, not the SPA', async () => {
    const res = await fetch(site.url + '/api/nope')
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { error: 'not_found' })
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
