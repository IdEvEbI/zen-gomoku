/**
 * 门禁 A：academy beginner 031–085 首着对照（planRootPhase vs 人机解）。
 *
 *   npx tsx scripts/audit-academy-first-moves.ts
 *   npm run audit:academy-first
 *
 * 期望表：fixtures/records/academy/beginner/gate-a-first-moves.json
 */
import { readFileSync } from 'fs'
import { parseGameRecord, rebuildFromRecord } from '../src/core/index.ts'
import { planRootPhase } from '../src/ai/rootPolicy.ts'

const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`

type GateATable = {
  accept: Record<string, string[]>
  miss: Record<string, { engine: string; expect: string }>
  hitIds: string[]
}

const table = JSON.parse(
  readFileSync('fixtures/records/academy/beginner/gate-a-first-moves.json', 'utf8')
) as GateATable

function loadPuzzle(id: string) {
  const raw = JSON.parse(readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8'))
  const parsed = parseGameRecord(raw)
  const rebuilt = rebuildFromRecord(parsed.ok ? parsed.record : raw)
  if ('error' in rebuilt) throw new Error(`${id}: rebuild failed`)
  return { board: rebuilt.board, toPlay: rebuilt.currentPlayer as 1 | 2 }
}

const ids = Object.keys(table.accept).sort()
const rows: { id: string; expect: string; phase: string; hit: boolean }[] = []

for (const id of ids) {
  const accept = table.accept[id]!
  const { board, toPlay } = loadPuzzle(id)
  const phase = planRootPhase(
    board.map((r) => r.slice()),
    toPlay,
    { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
  )
  const phaseSite = phase.type === 'terminal' ? site(phase.move.row, phase.move.col) : 'search'
  const hit = accept.includes(phaseSite)
  rows.push({ id, expect: accept.join('|'), phase: phaseSite, hit })
  console.log(`${hit ? 'OK  ' : 'MISS'} ${id} expect=${accept.join('|')} phase=${phaseSite}`)
}

const hitN = rows.filter((r) => r.hit).length
const miss = rows.filter((r) => !r.hit)
const band = (a: number, b: number) => {
  const slice = rows.filter((r) => {
    const n = parseInt(r.id, 10)
    return n >= a && n <= b
  })
  return `${slice.filter((r) => r.hit).length}/${slice.length}`
}

console.log('\n=== SUMMARY ===')
console.log(`total ${hitN}/${rows.length}`)
console.log(`031-050 ${band(31, 50)}`)
console.log(`051-070 ${band(51, 70)}`)
console.log(`071-085 ${band(71, 85)}`)
console.log('miss:', miss.map((m) => `${m.id}:${m.phase}≠${m.expect}`).join(' ') || '(none)')

const unexpectedHit = Object.keys(table.miss).filter((id) => {
  const row = rows.find((r) => r.id === id)
  return row?.hit
})
const unexpectedMiss = table.hitIds.filter((id) => {
  const row = rows.find((r) => r.id === id)
  return row && !row.hit
})
if (unexpectedHit.length || unexpectedMiss.length) {
  console.log('\n[drift vs gate-a-first-moves.json]')
  if (unexpectedHit.length) console.log('  former miss now hit:', unexpectedHit.join(', '))
  if (unexpectedMiss.length) console.log('  former hit now miss:', unexpectedMiss.join(', '))
  process.exitCode = 1
}
