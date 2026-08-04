/**
 * 人机四级难度：沙和尚 < 猪八戒(≈启发) < 孙悟空 < 唐僧
 * 详见 docs/design/ai-agents.md
 */

import type { IAgent } from './types'
import { HeuristicAgent } from './HeuristicAgent'
import { MinimaxAgent } from './MinimaxAgent'
import { ShaHeshangAgent } from './ShaHeshangAgent'

export type AiDifficulty = 'sha' | 'zhu' | 'wukong' | 'tang'

export interface AiDifficultyOption {
  id: AiDifficulty
  name: string
  blurb: string
}

/** 默认：猪八戒（≈ 现版启发） */
export const DEFAULT_AI_DIFFICULTY: AiDifficulty = 'zhu'

export const AI_DIFFICULTY_OPTIONS: readonly AiDifficultyOption[] = [
  { id: 'sha', name: '沙和尚', blurb: '入门，偶尔下次优' },
  { id: 'zhu', name: '猪八戒', blurb: '与现版启发相当' },
  { id: 'wukong', name: '孙悟空', blurb: '会多想两步' },
  { id: 'tang', name: '唐僧', blurb: '更深搜索' },
] as const

export function createAgentForDifficulty(
  difficulty: AiDifficulty,
  boardSize = 15
): IAgent {
  switch (difficulty) {
    case 'sha':
      return new ShaHeshangAgent({
        boardSize,
        topK: 4,
        bestMoveChance: 0.55,
      })
    case 'zhu':
      return new HeuristicAgent(boardSize)
    case 'wukong':
      return new MinimaxAgent({
        name: 'wukong',
        boardSize,
        maxDepth: 2,
        timeLimitMs: 180,
        candidateLimit: 12,
        iterativeDeepening: false,
      })
    case 'tang':
      return new MinimaxAgent({
        name: 'tang-seng',
        boardSize,
        maxDepth: 4,
        timeLimitMs: 350,
        candidateLimit: 10,
        iterativeDeepening: true,
      })
    default: {
      const _exhaustive: never = difficulty
      return _exhaustive
    }
  }
}

export function difficultyLabel(id: AiDifficulty): string {
  return AI_DIFFICULTY_OPTIONS.find((o) => o.id === id)?.name ?? id
}
