/**
 * 人机四级难度：沙和尚 < 猪八戒(≈启发) < 孙悟空 < 唐僧
 * 详见 docs/design/ai-agents.md
 */

import type { IAgent } from './types'
import { HeuristicAgent } from './HeuristicAgent'
import { MinimaxAgent } from './MinimaxAgent'
import { ShaHeshangAgent } from './ShaHeshangAgent'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'

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
  { id: 'tang', name: '唐僧', blurb: 'VCF/VCT + 更深搜索' },
] as const

export function createAgentForDifficulty(
  difficulty: AiDifficulty,
  boardSize = 15,
  rules: RuleSetId = DEFAULT_RULE_SET
): IAgent {
  switch (difficulty) {
    case 'sha':
      return new ShaHeshangAgent({
        boardSize,
        topK: 4,
        bestMoveChance: 0.55,
        rules,
      })
    case 'zhu':
      return new HeuristicAgent(boardSize, rules)
    case 'wukong':
      return new MinimaxAgent({
        name: 'wukong',
        boardSize,
        maxDepth: 2,
        timeLimitMs: 180,
        candidateLimit: 12,
        iterativeDeepening: false,
        rules,
      })
    case 'tang':
      return new MinimaxAgent({
        name: 'tang-seng',
        boardSize,
        maxDepth: 6,
        timeLimitMs: 1000,
        candidateLimit: 16,
        iterativeDeepening: true,
        vcfMaxPly: 12,
        vcfBudgetMs: 300,
        vctMaxPly: 12,
        vctBudgetMs: 400,
        softRootLimit: 16,
        rules,
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
