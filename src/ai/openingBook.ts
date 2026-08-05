/**
 * 人机 / 老师对弈共用开局书：经典形 + 八对称，避免每盘同一开局。
 * 坐标 15×15、0-based；花月/浦月等为教学近似形。
 */

import type { AiMove, AiPlayer } from './types'

export interface BookMove {
  r: number
  c: number
  player: AiPlayer
}

export interface OpeningSeed {
  id: string
  name: string
  /** 含天元在内的前缀着法；player 交替且黑先 */
  moves: BookMove[]
}

const C = 7

const TENGEN: BookMove = { r: C, c: C, player: 1 }

/** 基础种子（未展开对称）；白 2 与黑 3 相对天元 */
const BASE_SEEDS: readonly OpeningSeed[] = [
  {
    id: 'huayue',
    name: '花月',
    moves: [TENGEN, { r: 7, c: 8, player: 2 }, { r: 6, c: 8, player: 1 }],
  },
  {
    id: 'puyue',
    name: '浦月',
    moves: [TENGEN, { r: 7, c: 8, player: 2 }, { r: 6, c: 9, player: 1 }],
  },
  {
    id: 'zhixia',
    name: '直下',
    moves: [TENGEN, { r: 6, c: 7, player: 2 }, { r: 5, c: 7, player: 1 }],
  },
  {
    id: 'xieer',
    name: '斜二',
    moves: [TENGEN, { r: 6, c: 8, player: 2 }, { r: 5, c: 8, player: 1 }],
  },
  {
    id: 'pangxia',
    name: '旁下',
    moves: [TENGEN, { r: 7, c: 9, player: 2 }, { r: 6, c: 8, player: 1 }],
  },
]

/** 相对天元的 8 个二面体变换 */
const TRANSFORMS: readonly ((dr: number, dc: number) => [number, number])[] = [
  (dr, dc) => [dr, dc],
  (dr, dc) => [dc, -dr],
  (dr, dc) => [-dr, -dc],
  (dr, dc) => [-dc, dr],
  (dr, dc) => [dr, -dc],
  (dr, dc) => [-dc, -dr],
  (dr, dc) => [-dr, dc],
  (dr, dc) => [dc, dr],
]

function applyTransform(
  moves: readonly BookMove[],
  transform: (dr: number, dc: number) => [number, number]
): BookMove[] {
  return moves.map((m) => {
    if (m.r === C && m.c === C) return { ...m }
    const [dr, dc] = transform(m.r - C, m.c - C)
    return { r: C + dr, c: C + dc, player: m.player }
  })
}

function inBoard(r: number, c: number): boolean {
  return r >= 0 && r < 15 && c >= 0 && c < 15
}

/** 展开对称后的全部合法种子（供训练导出与人机开局） */
export function expandOpeningSeeds(bases: readonly OpeningSeed[] = BASE_SEEDS): OpeningSeed[] {
  const out: OpeningSeed[] = []
  for (const base of bases) {
    for (let t = 0; t < TRANSFORMS.length; t++) {
      const moves = applyTransform(base.moves, TRANSFORMS[t]!)
      if (moves.every((m) => inBoard(m.r, m.c))) {
        out.push({
          id: `${base.id}-t${t}`,
          name: base.name,
          moves,
        })
      }
    }
  }
  // 仅天元：让「纯启发」也占一小部分概率时由 controller 权重处理；此处仍放入一份
  out.push({ id: 'tengen', name: '天元', moves: [TENGEN] })
  return out
}

export const DEFAULT_OPENING_SEEDS: readonly OpeningSeed[] = expandOpeningSeeds()

export const SEED_TENGEN: OpeningSeed = {
  id: 'tengen',
  name: '天元',
  moves: [TENGEN],
}

export const SEED_HUAYUE = BASE_SEEDS[0]!
export const SEED_PUYUE = BASE_SEEDS[1]!

export function getOpeningSeedById(
  id: string,
  seeds: readonly OpeningSeed[] = DEFAULT_OPENING_SEEDS
): OpeningSeed | undefined {
  return seeds.find((s) => s.id === id)
}

export interface HistoryStone {
  row: number
  col: number
  player: number
}

/**
 * 对局级开局书控制器：每局 reset 抽一条线；着法偏离书则不再给书着（悔棋回到前缀后可再跟书）。
 */
export class OpeningBookController {
  private line: BookMove[] | null = null
  private readonly pool: readonly OpeningSeed[]
  private readonly random: () => number

  constructor(
    seeds: readonly OpeningSeed[] = DEFAULT_OPENING_SEEDS,
    random: () => number = Math.random
  ) {
    this.pool = seeds.length > 0 ? seeds : [SEED_TENGEN]
    this.random = random
  }

  reset(): void {
    const seed = this.pool[Math.floor(this.random() * this.pool.length)]!
    this.line = seed.moves.map((m) => ({ ...m }))
  }

  /** 当前选用的开局线（只读，调试用） */
  getLine(): readonly BookMove[] | null {
    return this.line
  }

  /**
   * 若 history 仍匹配开局书，且下一手轮到 player，返回书着；否则 null。
   */
  nextMove(history: readonly HistoryStone[], player: AiPlayer): AiMove | null {
    if (!this.line) return null

    for (let i = 0; i < history.length; i++) {
      const expected = this.line[i]
      const actual = history[i]
      if (
        !expected ||
        !actual ||
        expected.r !== actual.row ||
        expected.c !== actual.col ||
        expected.player !== actual.player
      ) {
        return null
      }
    }

    const next = this.line[history.length]
    if (!next) return null
    if (next.player !== player) return null
    if (!inBoard(next.r, next.c)) return null
    return { row: next.r, col: next.c }
  }
}
