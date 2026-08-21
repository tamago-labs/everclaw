#!/usr/bin/env node
// 1-everclaw-chat: Node wrapper that drives kane-cli to smoke-test the app
// Server must be running separately: npm run dev:cli (or npm start) on :3001
// Checks gate state via API so kane objective can branch, then spawns kane-cli run.

import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const API = process.env.API_BASE || 'http://localhost:3001'
const KANE_URL = process.env.KANE_URL || API

async function getJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

async function main() {
  console.log(`\n  1-everclaw-chat — gate → load if needed → chat (kane)\n  API: ${API}\n`)

  // 1) health pre-check (server separately)
  try {
    const h = await getJson(`${API}/api/health`)
    if (h.status !== 'ok') throw new Error('health not ok')
    console.log('  ✓ server up (GET /api/health ok)')
  } catch (e) {
    console.error(`\n  ✗ server not reachable at ${API}\n    Run separately first:  npm run dev:cli   (or npm start)\n    error: ${e.message}\n`)
    process.exit(2)
  }

  // 2) gate state (so we know what kane will see; kane itself branches)
  let status = null
  try {
    status = await getJson(`${API}/api/ai/status`)
    console.log(`  AI status: loaded=${status.loaded} model=${status.modelName || '-'}${status.isLoading ? ' (loading)' : ''}`)
  } catch (e) {
    console.warn(`  warn: could not fetch /api/ai/status: ${e.message} — kane will probe UI anyway`)
  }

  // 3) kane testmd — persistent per docs/kane-cli-testmd (first run authors + caches, later replays)
  // Resolve absolute so `node scripts/1-everclaw-chat.mjs` works from any cwd (fixes scripts/scripts/...)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const testFile = path.join(__dirname, '1-everclaw-chat_test.md')
  const args = [
    'testmd', 'run', testFile,
    '--agent',
    '--timeout', '600',
  ]

  console.log(`\n  spawning: kane-cli ${args.map(a => (a.includes(' ') ? `"${a.slice(0, 80)}..."` : a)).join(' ')}\n`)

  const env = { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' }
  const res = spawnSync('kane-cli', args, { stdio: 'inherit', env, shell: true })

  // spawnSync returns status = kane exit code (0 passed, 1 failed, 2 auth/infra, 3 timeout)
  if (res.error) {
    console.error(`\n  failed to spawn kane-cli: ${res.error.message}`)
    console.error('  is kane-cli installed?  npm i -g @testmuai/kane-cli  &&  kane-cli whoami')
    process.exit(2)
  }

  // If kane wrote evidence path to stderr, it's already printed via inherit
  process.exit(res.status ?? 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
