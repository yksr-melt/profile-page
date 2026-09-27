import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Swaps the freshly built dist.new in for dist, atomically (a rename, not a
// copy) so the server is never mid-swap looking at a half-written directory.
// The previous build is kept as dist.prev rather than deleted, in case a
// build succeeds but turns out to be bad in some way rename can't catch.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const next = path.join(root, 'dist.new')
const current = path.join(root, 'dist')
const prev = path.join(root, 'dist.prev')

if (!fs.existsSync(next)) {
  console.error('swap-dist: dist.new is missing (an earlier build step must have failed) — leaving dist as is')
  process.exit(1)
}

fs.rmSync(prev, { recursive: true, force: true })
if (fs.existsSync(current)) fs.renameSync(current, prev)
fs.renameSync(next, current)
console.log(`swap-dist: dist.new -> dist${fs.existsSync(prev) ? ' (previous build kept as dist.prev)' : ''}`)
