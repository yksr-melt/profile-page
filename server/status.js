import fs from 'node:fs'
import os from 'node:os'

// Numbers only: no hostname, OS/kernel/Node versions, process list or
// addresses leave this module. The server is public, and those details
// only help someone probing it.

const THERMAL_ZONE = '/sys/class/thermal/thermal_zone0/temp'

function cpuTimes() {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    const t = cpu.times
    idle += t.idle
    total += t.user + t.nice + t.sys + t.idle + t.irq
  }
  return { idle, total }
}

function readTemperature() {
  try {
    const milli = Number(fs.readFileSync(THERMAL_ZONE, 'utf-8').trim())
    return Number.isFinite(milli) ? milli / 1000 : null
  } catch {
    // Not a Pi (or no thermal zone): the frontend shows "unavailable".
    return null
  }
}

export const defaultProbe = {
  cpuTimes,
  memory: () => ({ total: os.totalmem(), free: os.freemem() }),
  temperature: readTemperature,
  uptime: () => os.uptime(),
  loadavg: () => os.loadavg(),
  cores: () => os.cpus().length,
}

const round1 = (n) => Math.round(n * 10) / 10
const GIB = 1024 ** 3
const clampPercent = (n) => Math.min(100, Math.max(0, n))

/**
 * Samples the machine every `intervalMs` and keeps the last `size` samples,
 * so any number of visitors cost one measurement per interval. Sampling only
 * runs while someone is looking: it starts on the first read and stops after
 * `idleMs` without one.
 */
export function createStatusSampler({ probe = defaultProbe, intervalMs = 2000, size = 60, idleMs = 60 * 1000, now = Date.now } = {}) {
  const cpuHistory = []
  const memoryHistory = []
  const temperatureHistory = []
  const loadHistory = []
  let prev = null
  let timer = null
  let lastRead = 0
  let latest = null

  function push(history, value) {
    history.push(value)
    if (history.length > size) history.shift()
  }

  function sample() {
    let cpu = null
    try {
      const times = probe.cpuTimes()
      if (prev && times.total > prev.total) {
        cpu = round1(clampPercent(100 * (1 - (times.idle - prev.idle) / (times.total - prev.total))))
      }
      prev = times
    } catch {
      prev = null
    }

    let memory = null
    try {
      const { total, free } = probe.memory()
      if (total > 0) {
        memory = {
          totalGiB: round1(total / GIB),
          usedGiB: round1((total - free) / GIB),
          percent: round1(clampPercent((100 * (total - free)) / total)),
        }
      }
    } catch {
      // Leave as null: shown as "unavailable", not 0%.
    }

    push(cpuHistory, cpu)
    push(memoryHistory, memory?.percent ?? null)

    const safe = (fn) => {
      try {
        return fn()
      } catch {
        return null
      }
    }
    const temperature = safe(probe.temperature)
    const load = safe(probe.loadavg)
    const uptime = safe(probe.uptime)

    // Coarse on purpose: uptime in whole days (seconds would give away when
    // the server was last restarted, i.e. deployed) and whole degrees. Load
    // keeps one decimal: it usually sits below 1, so whole numbers would be a
    // flat line at 0.
    latest = {
      cpu,
      memory,
      temperature: typeof temperature === 'number' ? Math.trunc(temperature) : null,
      uptimeDays: typeof uptime === 'number' ? Math.floor(uptime / 86400) : null,
      load: Array.isArray(load) ? load.map((n) => Math.round(n * 10) / 10) : null,
      cores: safe(probe.cores),
    }
    push(temperatureHistory, latest.temperature)
    push(loadHistory, latest.load ? latest.load[0] : null)

    if (now() - lastRead > idleMs) stop()
  }

  function start() {
    if (timer) return
    // A fresh start: samples from before the idle stop would otherwise show
    // up as "the last two minutes".
    prev = null
    cpuHistory.length = 0
    memoryHistory.length = 0
    temperatureHistory.length = 0
    loadHistory.length = 0
    sample() // primes the CPU baseline; the first CPU value arrives next tick
    timer = setInterval(sample, intervalMs)
    timer.unref?.()
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  return {
    read() {
      lastRead = now()
      start()
      return {
        intervalMs,
        ...latest,
        history: {
          cpu: [...cpuHistory],
          memory: [...memoryHistory],
          temperature: [...temperatureHistory],
          load: [...loadHistory],
        },
      }
    },
    stop,
    // For tests.
    sample,
    get running() {
      return timer !== null
    },
  }
}
