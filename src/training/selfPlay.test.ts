import { describe, it, expect } from 'vitest'
import { RULE_FREESTYLE, RULE_RENJU_CN, rebuildFromRecord, type RuleSetId } from '../core'
import type { IAgent, AiMove } from '../ai'
import { listEmptyCells } from '../ai'
import { filterLegalCandidates } from '../ai/evaluate'
import { playSelfPlayGame } from './selfPlay'
import { generateTeacherRecords, recordsToJsonl } from './generateTeacherRecords'
import { SEED_HUAYUE, SEED_PUYUE } from './openingSeeds'

/** 快 Agent：随机合法点，便于 smoke */
function createRandomLegalAgent(rules: RuleSetId): IAgent {
  return {
    name: 'test-random',
    async getNextMove(board): Promise<AiMove | null> {
      const player = (() => {
        let b = 0
        let w = 0
        for (const row of board) {
          for (const c of row) {
            if (c === 1) b++
            else if (c === 2) w++
          }
        }
        return (b <= w ? 1 : 2) as 1 | 2
      })()
      const legal = filterLegalCandidates(board, listEmptyCells(board), player, rules)
      if (legal.length === 0) return null
      return legal[0]!
    },
  }
}

describe('playSelfPlayGame / generateTeacherRecords', () => {
  it('seed opening huayue then agents finish a freestyle game', async () => {
    const agent = createRandomLegalAgent(RULE_FREESTYLE)
    const record = await playSelfPlayGame({
      rules: RULE_FREESTYLE,
      blackAgent: agent,
      whiteAgent: agent,
      opening: { mode: 'seed', seedMoves: SEED_HUAYUE.moves },
      random: () => 0.1,
    })
    expect(record.rules).toBe(RULE_FREESTYLE)
    expect(record.moves[0]).toEqual({ r: 7, c: 7, player: 1 })
    expect(record.moves[1]).toEqual({ r: 7, c: 8, player: 2 })
    expect(record.moves[2]).toEqual({ r: 6, c: 8, player: 1 })
    expect(record.status).toBeDefined()
    expect(['black_win', 'white_win', 'draw']).toContain(record.status)
    const rebuilt = rebuildFromRecord(record)
    expect('error' in rebuilt).toBe(false)
  })

  it('puyue seed is legal under renju', async () => {
    const agent = createRandomLegalAgent(RULE_RENJU_CN)
    const record = await playSelfPlayGame({
      rules: RULE_RENJU_CN,
      blackAgent: agent,
      whiteAgent: agent,
      opening: { mode: 'seed', seedMoves: SEED_PUYUE.moves },
      random: () => 0.2,
    })
    expect(record.rules).toBe(RULE_RENJU_CN)
    expect(record.moves.length).toBeGreaterThanOrEqual(3)
    const rebuilt = rebuildFromRecord(record)
    expect('error' in rebuilt).toBe(false)
  })

  it('generateTeacherRecords batch with injected agent', async () => {
    let seq = 0
    const records = await generateTeacherRecords({
      rules: RULE_FREESTYLE,
      count: 2,
      openingMode: 'mixed',
      randomExtraMoves: 1,
      random: () => {
        seq += 0.17
        return seq % 1
      },
      createAgent: (rules) => createRandomLegalAgent(rules),
    })
    expect(records).toHaveLength(2)
    for (const r of records) {
      expect(r.rules).toBe(RULE_FREESTYLE)
      expect(r.moves.length).toBeGreaterThan(0)
      expect(r.status).toBeDefined()
    }
    const jsonl = recordsToJsonl(records)
    const lines = jsonl.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]!).rules).toBe(RULE_FREESTYLE)
  })

  it('renju batch smoke', async () => {
    const records = await generateTeacherRecords({
      rules: RULE_RENJU_CN,
      count: 2,
      openingMode: 'seed',
      seedIds: ['huayue', 'puyue'],
      random: () => 0.3,
      createAgent: (rules) => createRandomLegalAgent(rules),
    })
    expect(records).toHaveLength(2)
    expect(records.every((r) => r.rules === RULE_RENJU_CN)).toBe(true)
    for (const r of records) {
      expect('error' in rebuildFromRecord(r)).toBe(false)
    }
  })

  it('onProgress fires once per game', async () => {
    const events: number[] = []
    await generateTeacherRecords({
      rules: RULE_FREESTYLE,
      count: 3,
      openingMode: 'seed',
      seedIds: ['tengen'],
      random: () => 0.1,
      createAgent: (rules) => createRandomLegalAgent(rules),
      onProgress: (info) => {
        events.push(info.index)
        expect(info.total).toBe(3)
        expect(info.gameMs).toBeGreaterThanOrEqual(0)
        expect(info.elapsedMs).toBeGreaterThanOrEqual(info.gameMs)
      },
    })
    expect(events).toEqual([1, 2, 3])
  })
})
