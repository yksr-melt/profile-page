import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { createApp } from '../app.js'
import { initialData, withInitialData } from '../initial-data.js'
import { NOT_FOUND_FILE } from '../routes.js'

const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
const PAGE = '<!doctype html><html><head><title>spa</title></head><body><div id="root"></div></body></html>'

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'profile-page-initial-'))
}

function makeDist(html = PAGE) {
  const distDir = tempDir()
  fs.writeFileSync(path.join(distDir, 'index.html'), html)
  for (const dir of ['me', 'music']) {
    fs.mkdirSync(path.join(distDir, dir))
    fs.writeFileSync(path.join(distDir, dir, 'index.html'), html)
  }
  // Distinct from `html` so a page's content is never mistaken for the
  // not-found page's.
  fs.writeFileSync(path.join(distDir, NOT_FOUND_FILE), PAGE.replace('<title>spa', '<title>not-found'))
  fs.mkdirSync(path.join(distDir, 'assets'))
  fs.writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log(1)')
  fs.writeFileSync(path.join(distDir, 'avatar.jpg'), 'jpg')
  return distDir
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }
}

function source(result) {
  return { result, configured: () => true, ttlMs: 60 * 1000, fetch: async () => source_result(result) }
}
const source_result = (r) => {
  if (r instanceof Error) throw r
  return r
}

function sourcesFor(values) {
  return {
    'github:summary': source(values.github),
    'github:repos': source({ repos: true }),
    'lastfm:dashboard': source(values.lastfm),
  }
}

// The JSON inside the embedded <script>, as the browser would read it.
function embedded(html) {
  const match = html.match(/<script id="initial-data" type="application\/json">([\s\S]*?)<\/script>/)
  return match ? JSON.parse(match[1]) : null
}

describe('withInitialData', () => {
  test('leaves the page alone when there is nothing to embed', () => {
    assert.equal(withInitialData(PAGE, {}), PAGE)
  })

  test('leaves a page without </body> alone', () => {
    assert.equal(withInitialData('<p>hi</p>', { '/api/x': 1 }), '<p>hi</p>')
  })

  test('keeps upstream text from closing the script or being read as a replacement pattern', () => {
    const nasty = { title: '</script><script>alert(1)</script>', note: "$& $1 $` $'", sep: `a${LS}b${PS}c`, c: '<!--' }
    const html = withInitialData(PAGE, { '/api/x': nasty })
    assert.ok(!html.includes('</script><script>alert'), 'script block was closed early')
    assert.ok(!html.includes('<!--'))
    assert.ok(!html.includes(LS) && !html.includes(PS))
    assert.deepEqual(embedded(html), { '/api/x': nasty })
    // It is still one well-formed page: the data sits just before </body>.
    assert.ok(html.endsWith('</script></body></html>'))
  })
})

describe('initialData', () => {
  test('picks the embedded endpoints from the last good store, skipping missing ones', () => {
    const lastGood = { get: (key) => ({ 'github:summary': { n: 1 }, 'github:repos': { n: 2 } })[key] }
    assert.deepEqual(initialData(lastGood), { '/api/github/summary': { n: 1 } })
  })
})

describe('serving the page', () => {
  let site
  let distDir
  const dataDir = tempDir()
  const github = { totalContributions: 5 }
  const lastfm = { weeklyPlays: 3 }

  before(async () => {
    distDir = makeDist()
    site = await listen(createApp({ distDir, dataDir, sources: sourcesFor({ github, lastfm }) }))
  })
  after(() => site.close())

  test('no data has been fetched yet: plain page', async () => {
    const res = await fetch(site.url + '/')
    assert.equal(res.status, 200)
    assert.equal(embedded(await res.text()), null)
  })

  test('once fetched, tab paths carry the data, with 200', async () => {
    await fetch(site.url + '/api/github/summary')
    await fetch(site.url + '/api/lastfm/dashboard')
    for (const p of ['/', '/me', '/music/']) {
      const res = await fetch(site.url + p)
      assert.equal(res.status, 200, p)
      assert.match(res.headers.get('content-type'), /text\/html/, p)
      assert.deepEqual(embedded(await res.text()), { '/api/github/summary': github, '/api/lastfm/dashboard': lastfm }, p)
    }
  })

  test('unknown paths get the not-found page with 404, without data', async () => {
    const res = await fetch(site.url + '/typo')
    assert.equal(res.status, 404)
    const html = await res.text()
    assert.equal(embedded(html), null)
    assert.match(html, /<title>not-found<\/title>/)
  })

  test('index.html is revalidated every time (max-age=0)', async () => {
    for (const p of ['/', '/typo', '/index.html']) {
      const res = await fetch(site.url + p)
      assert.equal(res.headers.get('cache-control'), 'public, max-age=0', p)
    }
  })

  test('a rebuilt page is served without a restart (each route\'s file is read fresh)', async () => {
    fs.writeFileSync(path.join(distDir, 'index.html'), PAGE.replace('spa', 'rebuilt'))
    const html = await (await fetch(site.url + '/')).text()
    assert.match(html, /<title>rebuilt<\/title>/)
    assert.deepEqual(embedded(html), { '/api/github/summary': github, '/api/lastfm/dashboard': lastfm })
    // A different route's file, untouched, is unaffected.
    const music = await fetch(site.url + '/music/')
    assert.match(await music.text(), /<title>spa<\/title>/)
  })

  test('hashed assets are cached for good, everything else is not', async () => {
    const asset = await fetch(site.url + '/assets/app-abc123.js')
    assert.equal(asset.status, 200)
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable')

    const other = await fetch(site.url + '/avatar.jpg')
    assert.equal(other.status, 200)
    assert.equal(other.headers.get('cache-control'), 'public, max-age=0')
  })

  test('data saved before a restart is embedded by the new process', async () => {
    // The previous app wrote last-good.json when it fetched; give it a moment.
    await new Promise((resolve) => setTimeout(resolve, 50))
    const failing = sourcesFor({ github: new Error('down'), lastfm: new Error('down') })
    const restarted = await listen(createApp({ distDir, dataDir, sources: failing }))
    try {
      const html = await (await fetch(restarted.url + '/')).text()
      assert.deepEqual(embedded(html), { '/api/github/summary': github, '/api/lastfm/dashboard': lastfm })
    } finally {
      restarted.close()
    }
  })
})
