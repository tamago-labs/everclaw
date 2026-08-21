#!/usr/bin/env node
// 2-everclaw-agent: create Alex (not Sally) → chat via new session → delete, all via kane UI
// Server must be running separately: npm run dev:cli on :3001

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
  console.log(`\n  2-everclaw-agent — add and remove Alex (kane testmd)\n  API: ${API}\n`)

  try {
    const h = await getJson(`${API}/api/health`)
    if (h.status !== 'ok') throw new Error('health not ok')
    console.log('  ✓ server up (GET /api/health ok)')
  } catch (e) {
    console.error(`\n  ✗ server not reachable at ${API}\n    Run separately: npm run dev:cli\n    error: ${e.message}\n`)
    process.exit(2)
  }

  let status = null
  try {
    status = await getJson(`${API}/api/ai/status`)
    console.log(`  AI status: loaded=${status.loaded} model=${status.modelName || '-'}${status.isLoading ? ' (loading)' : ''}`)
    if (!status.loaded) {
      console.warn('  warn: no model loaded — run node scripts/1-everclaw-chat.mjs first, otherwise chat will error "No model loaded"')
    }
  } catch (e) {
    console.warn(`  warn: could not fetch /api/ai/status: ${e.message}`)
  }

  // 3) kane testmd — persistent like 1 (add + remove only, no chat)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const testFile = path.join(__dirname, '2-everclaw-agent_test.md')
  const args = ['testmd', 'run', testFile, '--agent', '--timeout', '600']

  console.log(`\n  spawning: kane-cli testmd run ${testFile} --agent --timeout 600\n`)

  const env = { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' }
  const res = spawnSync('kane-cli', args, { stdio: 'inherit', env, shell: true })

  if (res.error) {
    console.error(`\n  failed to spawn kane-cli: ${res.error.message}`)
    process.exit(2)
  }
  process.exit(res.status ?? 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
