import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'
import { createApp } from '../app.js'
import { createStatusSampler } from '../status.js'

const GIB = 1024 ** 3

// A probe whose readings are controlled by the test.
function fakeProbe() {
  const probe = {
    times: { idle: 0, total: 0 },
    cpuTimes: () => probe.times,
    memory: () => ({ total: 4 * GIB, free: 3 * GIB }),
    temperature: () => 48.9,
    uptime: () => 3 * 86400 + 5000,
    loadavg: () => [0.93, 1.5, 2.01],
    cores: () => 4,
  }
  return probe
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }
}

describe('status sampler', () => {
  test('CPU usage comes from the change in CPU times between samples', () => {
    const probe = fakeProbe()
    const status = createStatusSampler({ probe })
    status.read() // starts sampling; the first sample is the baseline
    probe.times = { idle: 75, total: 100 }
    status.sample()
    const s = status.read()
    status.stop()
    assert.equal(s.cpu, 25)
    assert.deepEqual(s.history.cpu, [null, 25])
  })

  test('values are coarse: whole days, whole degrees, whole load', () => {
    const status = createStatusSampler({ probe: fakeProbe() })
    const s = status.read()
    status.stop()
    assert.equal(s.uptimeDays, 3)
    assert.equal(s.temperature, 48)
    assert.deepEqual(s.load, [0, 1, 2])
    assert.deepEqual(s.memory, { totalGiB: 4, usedGiB: 1, percent: 25 })
    assert.equal(s.cores, 4)
  })

  test('a failing reading becomes null instead of breaking the sample', () => {
    const probe = fakeProbe()
    const boom = () => {
      throw new Error('no such file')
    }
    Object.assign(probe, { temperature: boom, memory: boom, cpuTimes: boom, uptime: boom, loadavg: boom })
    const status = createStatusSampler({ probe })
    const s = status.read()
    status.stop()
    assert.equal(s.temperature, null)
    assert.equal(s.memory, null)
    assert.equal(s.cpu, null)
    assert.equal(s.uptimeDays, null)
    assert.equal(s.load, null)
    assert.deepEqual(s.history.memory, [null])
  })

  test('history keeps only the last `size` samples', () => {
    const status = createStatusSampler({ probe: fakeProbe(), size: 3 })
    for (let i = 0; i < 5; i++) status.sample()
    assert.equal(status.read().history.cpu.length, 3)
    status.stop()
  })

  test('sampling starts on read and stops when nobody has read for a while', () => {
    let t = 0
    const status = createStatusSampler({ probe: fakeProbe(), idleMs: 1000, now: () => t })
    assert.equal(status.running, false)
    status.read()
    assert.equal(status.running, true)
    t = 5000
    status.sample()
    assert.equal(status.running, false)
  })
})

describe('/api/status', () => {
  test('returns only the agreed keys, with nothing identifying the machine', async () => {
    const status = createStatusSampler({ probe: fakeProbe() })
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-page-status-'))
    const site = await listen(createApp({ dataDir, distDir: path.join(dataDir, 'no-dist'), status }))
    try {
      const res = await fetch(site.url + '/api/status')
      assert.equal(res.status, 200)
      assert.equal(res.headers.get('cache-control'), 'no-store')
      const body = await res.json()
      assert.deepEqual(Object.keys(body).sort(), ['cores', 'cpu', 'history', 'intervalMs', 'load', 'memory', 'temperature', 'uptimeDays'])
      assert.deepEqual(Object.keys(body.history).sort(), ['cpu', 'memory'])
      const text = JSON.stringify(body)
      assert.ok(!text.includes(os.hostname()), 'hostname leaked')
      assert.ok(!text.includes('/'), 'path leaked')
    } finally {
      status.stop()
      site.close()
    }
  })

  test('a sampler failure is a fixed short error', async () => {
    const status = {
      read() {
        throw new Error('EACCES /secret/path')
      },
    }
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-page-status-'))
    const site = await listen(createApp({ dataDir, distDir: path.join(dataDir, 'no-dist'), status }))
    try {
      const res = await fetch(site.url + '/api/status')
      assert.equal(res.status, 503)
      assert.deepEqual(await res.json(), { error: 'status_unavailable' })
    } finally {
      site.close()
    }
  })
})
