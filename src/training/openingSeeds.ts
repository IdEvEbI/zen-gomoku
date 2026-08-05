/**
 * 经典开局种子（MVP）：天元开局后的前几手形状，用于丰富老师对弈开局分布。
 * 坐标为 15×15、0-based；花月/浦月为常见教学形近似，非完整定式库。
 */

import type { RecordMove } from '../core'

export interface OpeningSeed {
  id: string
  name: string
  /** 含天元在内的前缀着法；player 须交替且黑先 */
  moves: RecordMove[]
}

const TENGEN: RecordMove = { r: 7, c: 7, player: 1 }

/** 仅天元 */
export const SEED_TENGEN: OpeningSeed = {
  id: 'tengen',
  name: '天元',
  moves: [TENGEN],
}

/**
 * 花月形近似：黑天元 → 白旁贴 → 黑斜二（直指标记中常称花月一类）
 * B(7,7) W(7,8) B(6,8)
 */
export const SEED_HUAYUE: OpeningSeed = {
  id: 'huayue',
  name: '花月',
  moves: [TENGEN, { r: 7, c: 8, player: 2 }, { r: 6, c: 8, player: 1 }],
}

/**
 * 浦月形近似：黑天元 → 白旁贴 → 黑斜跳（斜指系常见浦月方向）
 * B(7,7) W(7,8) B(6,9)
 */
export const SEED_PUYUE: OpeningSeed = {
  id: 'puyue',
  name: '浦月',
  moves: [TENGEN, { r: 7, c: 8, player: 2 }, { r: 6, c: 9, player: 1 }],
}

export const DEFAULT_OPENING_SEEDS: readonly OpeningSeed[] = [SEED_TENGEN, SEED_HUAYUE, SEED_PUYUE]

export function getOpeningSeedById(
  id: string,
  seeds: readonly OpeningSeed[] = DEFAULT_OPENING_SEEDS
): OpeningSeed | undefined {
  return seeds.find((s) => s.id === id)
}
