/**
 * Spot-check Tang first move vs human academy solutions.
 * Usage: npx tsx scripts/spot-academy-tang.ts
 */
import { readFileSync } from 'node:fs'
import { parseGameRecord, rebuildFromRecord } from '../src/core/gameRecord'
import { createAgentForDifficulty } from '../src/ai/index'
import { planRootPhase } from '../src/ai/rootPolicy'

const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`

const IDS = [46, 48, 57, 58, 61, 64, 71, 72, 74, 79, 80, 81, 82, 83, 84, 85]

async function main() {
  let hit = 0
  for (const n of IDS) {
    const id = String(n).padStart(3, '0')
    const puz = JSON.parse(readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8'))
    const sol = JSON.parse(
      readFileSync(`fixtures/records/academy/beginner/${id}-solution.json`, 'utf8')
    )
    const humanFirst = sol.meta?.humanFirst as string
    const parsed = parseGameRecord(puz)
    if (!parsed.ok) throw new Error(parsed.message)
    const rb = rebuildFromRecord(parsed.record)
    if ('error' in rb) throw new Error(rb.error)
    const att = rb.currentPlayer as 1 | 2
    const phase = planRootPhase(
      rb.board.map((r) => r.slice()),
      att,
      {
        vcfMaxPly: 14,
        vctMaxPly: 16,
        vctMaxNodes: 80_000,
      }
    )
    const tang = await createAgentForDifficulty('tang').getNextMove(rb.board.map((r) => r.slice()))
    const tangS = tang ? site(tang.row, tang.col) : null
    const phaseS = phase.type === 'terminal' ? site(phase.move.row, phase.move.col) : phase.type
    const ok = tangS === humanFirst
    if (ok) hit++
    console.log(id, ok ? 'HIT' : 'MISS', 'H', humanFirst, 'T', tangS, 'P', phaseS)
  }
  console.log(`\n${hit}/${IDS.length}`)
}
main()
