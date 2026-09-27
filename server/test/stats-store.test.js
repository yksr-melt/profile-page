import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'
import { createStatsStore } from '../stats-store.js'

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stats-')), 'stats.json')
}

describe('createStatsStore', () => {
  test('reads {visits:0} when there is nothing on disk yet', () => {
    assert.deepEqual(createStatsStore(tempFile()).read(), { visits: 0 })
  })

  test('a missing file starts at 0 and is written normally', async () => {
    const file = tempFile()
    const store = createStatsStore(file)
    const result = store.update((s) => ({ visits: (s.visits || 0) + 1 }))
    assert.deepEqual(result, { visits: 1 })
    await store.flush()
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), { visits: 1 })
  })

  test('a corrupt (not missing) file starts read-only: update() is a no-op and never overwrites it', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-'))
    const file = path.join(dir, 'stats.json')
    const before = '{"visits":42,"not even valid json'
    fs.writeFileSync(file, before)
    const store = createStatsStore(file)
    assert.deepEqual(store.read(), { visits: 0 })
    const result = store.update((s) => ({ visits: (s.visits || 0) + 1 }))
    assert.deepEqual(result, { visits: 0 })
    await store.flush()
    assert.equal(fs.readFileSync(file, 'utf-8'), before, 'the corrupt file must be left untouched')
  })

  test('writes atomically (temp file, then rename) and reads it back', async () => {
    const file = tempFile()
    const store = createStatsStore(file)
    store.update(() => ({ visits: 5 }))
    await store.flush()
    assert.deepEqual(store.read(), { visits: 5 })
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), { visits: 5 })
    assert.ok(!fs.existsSync(`${file}.tmp`))
  })

  test('updates applied back-to-back (nothing awaited in between) are not lost', async () => {
    const file = tempFile()
    const store = createStatsStore(file)
    for (let i = 0; i < 20; i++) store.update((s) => ({ visits: (s.visits || 0) + 1 }))
    assert.deepEqual(store.read(), { visits: 20 })
    await store.flush()
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), { visits: 20 })
  })
})
