/**
 * 批量生成老师棋谱：默认唐僧 vs 唐僧，按规则分套
 */

import { DEFAULT_RULE_SET, type GameRecord, type RuleSetId } from '../core'
import { createAgentForDifficulty, type AiDifficulty } from '../ai'
import { playSelfPlayGame, type OpeningMode, type OpeningPlan } from './selfPlay'
import { DEFAULT_OPENING_SEEDS, getOpeningSeedById, type OpeningSeed } from './openingSeeds'

export interface GenerateTeacherRecordsOptions {
  rules: RuleSetId
  count: number
  /** 默认 tang */
  difficulty?: AiDifficulty
  boardSize?: number
  openingMode?: OpeningMode
  randomExtraMoves?: number
  /** 限定使用的种子 id；默认全部 DEFAULT_OPENING_SEEDS */
  seedIds?: string[]
  seeds?: readonly OpeningSeed[]
  seedProbability?: number
  maxMoves?: number
  random?: () => number
  /** 单测可注入更快 Agent */
  createAgent?: (
    rules: RuleSetId,
    role: 'black' | 'white'
  ) => ReturnType<typeof createAgentForDifficulty>
}

function pickSeed(seeds: readonly OpeningSeed[], random: () => number): OpeningSeed {
  if (seeds.length === 0) {
    return { id: 'tengen', name: '天元', moves: [{ r: 7, c: 7, player: 1 }] }
  }
  return seeds[Math.floor(random() * seeds.length)]!
}

function resolveSeeds(options: GenerateTeacherRecordsOptions): OpeningSeed[] {
  const pool = options.seeds ?? DEFAULT_OPENING_SEEDS
  if (!options.seedIds?.length) return [...pool]
  const found: OpeningSeed[] = []
  for (const id of options.seedIds) {
    const s = getOpeningSeedById(id, pool)
    if (s) found.push(s)
  }
  return found.length > 0 ? found : [...pool]
}

/**
 * 生成 count 局老师棋谱（同一 rules）。
 */
export async function generateTeacherRecords(
  options: GenerateTeacherRecordsOptions
): Promise<GameRecord[]> {
  const count = Math.max(0, Math.floor(options.count))
  const difficulty = options.difficulty ?? 'tang'
  const openingMode = options.openingMode ?? 'mixed'
  const random = options.random ?? Math.random
  const seeds = resolveSeeds(options)
  const createAgent =
    options.createAgent ??
    ((rules: RuleSetId) => createAgentForDifficulty(difficulty, options.boardSize ?? 15, rules))

  const records: GameRecord[] = []
  for (let i = 0; i < count; i++) {
    const seed = pickSeed(seeds, random)
    const opening: OpeningPlan = {
      mode: openingMode,
      randomExtraMoves: options.randomExtraMoves ?? 2,
      seedMoves: seed.moves,
      seedProbability: options.seedProbability ?? 0.5,
    }
    const record = await playSelfPlayGame({
      rules: options.rules ?? DEFAULT_RULE_SET,
      boardSize: options.boardSize,
      blackAgent: createAgent(options.rules, 'black'),
      whiteAgent: createAgent(options.rules, 'white'),
      opening,
      maxMoves: options.maxMoves,
      random,
    })
    records.push(record)
  }
  return records
}

/** JSONL：每行一个 GameRecord */
export function recordsToJsonl(records: GameRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '')
}
