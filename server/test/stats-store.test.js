import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'
import { createStatsStore } from '../stats-store.js'

describe('createStatsStore', () => {
  test('reads {visits:0} when there is nothing on disk yet', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stats-')), 'stats.json')
    assert.deepEqual(createStatsStore(file).read(), { visits: 0 })
  })

  test('a corrupt file is ignored, not fatal', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-'))
    const file = path.join(dir, 'stats.json')
    fs.writeFileSync(file, '{not json')
    assert.deepEqual(createStatsStore(file).read(), { visits: 0 })
  })

  test('writes atomically (temp file, then rename) and reads it back', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-'))
    const file = path.join(dir, 'stats.json')
    const store = createStatsStore(file)
    await store.write({ visits: 5 })
    assert.deepEqual(store.read(), { visits: 5 })
    assert.ok(!fs.existsSync(`${file}.tmp`))
  })

  test('concurrent writes do not race on the temp file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-'))
    const file = path.join(dir, 'stats.json')
    const store = createStatsStore(file)
    await Promise.all([store.write({ visits: 1 }), store.write({ visits: 2 }), store.write({ visits: 3 })])
    assert.deepEqual(store.read(), { visits: 3 })
  })
})
