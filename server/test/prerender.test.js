import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { after, before, describe, test } from 'node:test'

const root = path.join(import.meta.dirname, '..', '..')
const routes = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'routes.json'), 'utf-8'))

// Text unique enough to each page to prove its own content, not another
// page's, was rendered for that route.
const PAGE_TEXT = {
  home: 'プログラミングと音楽',
  product: '作ったもの',
  music: '聴いているもの',
  me: '自分自身',
  links: 'リンク集',
}

describe('prerendering', () => {
  let render
  let ssrDir

  before(() => {
    // Under the project root (not the system temp dir): the built module
    // imports 'react' etc. by bare specifier, resolved by walking up from
    // its own location, so it has to be somewhere Node will find this
    // project's node_modules from.
    ssrDir = fs.mkdtempSync(path.join(root, 'node_modules', '.tmp-entry-server-'))
    // A real vite --ssr build, so this exercises exactly what `npm run
    // build` runs — not a hand-rolled stand-in for it.
    execFileSync('npx', ['vite', 'build', '--ssr', 'src/entry-server.tsx', '--outDir', ssrDir, '--emptyOutDir'], {
      cwd: root,
      stdio: 'pipe',
    })
  })

  before(async () => {
    ;({ render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href))
  })

  after(() => fs.rmSync(ssrDir, { recursive: true, force: true }))

  for (const [tab, routePath] of Object.entries(routes)) {
    test(`${routePath} (tab "${tab}") renders that page's own content`, () => {
      const { html, notFound } = render(routePath)
      assert.equal(notFound, false)
      assert.ok(html.includes(PAGE_TEXT[tab]), `expected ${JSON.stringify(PAGE_TEXT[tab])} in the ${routePath} output`)
    })
  }

  test('an unknown path renders the not-found page instead of a tab', () => {
    const { html, notFound } = render('/this-is-not-a-route')
    assert.equal(notFound, true)
    assert.ok(html.includes('ページが見つかりません'))
  })

  test('nothing in any rendered page starts invisible (opacity: 0) waiting on JS', () => {
    for (const routePath of [...Object.values(routes), '/this-is-not-a-route']) {
      const { html } = render(routePath)
      assert.ok(!html.includes('opacity:0'), `${routePath} contains an inline opacity:0`)
    }
  })
})
