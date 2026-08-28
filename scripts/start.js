import { spawn } from 'node:child_process'

const API_PORT = 3001
const { PORT: _inheritedPort, ...envWithoutPort } = process.env

const procs = [
  {
    name: 'api',
    color: '\x1b[35m',
    cmd: 'node',
    args: ['--watch', 'server/index.js'],
    env: { ...envWithoutPort, PORT: String(API_PORT) },
  },
  {
    name: 'web',
    color: '\x1b[36m',
    cmd: 'npx',
    args: ['vite'],
    env: envWithoutPort,
  },
]

const reset = '\x1b[0m'
const children = []
let shuttingDown = false

function prefix(name, color, chunk) {
  const lines = chunk.toString().split('\n')
  for (const line of lines) {
    if (line.length === 0) continue
    process.stdout.write(`${color}[${name}]${reset} ${line}\n`)
  }
}

for (const proc of procs) {
  const child = spawn(proc.cmd, proc.args, { stdio: ['ignore', 'pipe', 'pipe'], env: proc.env })
  child.stdout.on('data', (chunk) => prefix(proc.name, proc.color, chunk))
  child.stderr.on('data', (chunk) => prefix(proc.name, proc.color, chunk))
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.log(`${proc.color}[${proc.name}]${reset} exited with code ${code}, stopping the other process...`)
      shutdown()
    }
  })
  children.push(child)
}

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
