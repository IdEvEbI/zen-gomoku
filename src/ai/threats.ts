/**
 * 威胁检测（冲四 / 活三 / 必防）
 *
 * 形定义（本仓简化，与单测一致）：
 * - 一步胜：落子后 checkWinner
 * - 冲四：落子后己方存在「下一步可胜」点（对方不堵则负）
 * - 活三：落子后己方存在冲四点（对方不挡则可走成冲四）
 */

import { checkWinner } from '../core'
import { isLegalMove } from '../core/forbiddenMoves'
import { DEFAULT_RULE_SET, RULE_FREESTYLE, type RuleSetId } from '../core/rules'
import type { AiMove, AiPlayer } from './types'
import { listEmptyCells, nextPlayerFromBoard } from './types'

/** 与 evaluate.DEFAULT_NEIGHBOR_RADIUS 对齐，避免循环依赖 */
const NEIGHBOR_RADIUS = 2

function other(p: AiPlayer): AiPlayer {
  return p === 1 ? 2 : 1
}

function moveKey(m: AiMove): string {
  return `${m.row},${m.col}`
}

function uniqueMoves(moves: AiMove[]): AiMove[] {
  const seen = new Set<string>()
  const out: AiMove[] = []
  for (const m of moves) {
    const k = moveKey(m)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(m)
  }
  return out
}

function hasNeighbor(board: number[][], row: number, col: number, radius: number): boolean {
  const size = board.length
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r < 0 || c < 0 || r >= size || c >= size) continue
      const v = board[r]?.[c]
      if (v === 1 || v === 2) return true
    }
  }
  return false
}

function candidatePool(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId,
  radius: number
): AiMove[] {
  const empty = listEmptyCells(board)
  const stoneCount = board.length * board.length - empty.length
  let pool: AiMove[]
  if (stoneCount === 0) {
    const mid = Math.floor(board.length / 2)
    pool = [{ row: mid, col: mid }]
  } else if (stoneCount <= 2) {
    pool = empty
  } else {
    const near = empty.filter((m) => hasNeighbor(board, m.row, m.col, radius))
    pool = near.length > 0 ? near : empty
  }
  if (rules === RULE_FREESTYLE) return pool
  return pool.filter((m) => isLegalMove(board, m.row, m.col, player, rules))
}

/** 一手当场五连的点 */
export function findWinningMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    const win = checkWinner(board, m.row, m.col, rules) === player
    board[m.row]![m.col] = 0
    if (win) out.push(m)
  }
  return out
}

/**
 * 冲四 / 活四类：落子后己方至少有一个「下一步可胜」点。
 * （含冲四与活四；不区分两端是否全开。）
 */
export function findFourThreatMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    const threatens = findWinningMoves(board, player, rules, radius).length > 0
    board[m.row]![m.col] = 0
    if (threatens) out.push(m)
  }
  return out
}

/**
 * 活三（简化）：落子后未直接胜、未已是冲四，但存在冲四点。
 */
export function findOpenThreeMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    if (findWinningMoves(board, player, rules, radius).length > 0) {
      board[m.row]![m.col] = 0
      continue
    }
    const makesFour = findFourThreatMoves(board, player, rules, radius).length > 0
    board[m.row]![m.col] = 0
    if (makesFour) out.push(m)
  }
  return out
}

const LINE_DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

/**
 * 已落子 (row,col) 是否在某一方向形成活四：恰好 4 连且两端皆空。
 * （避免用「全局胜点 ≥2」误把多个无关冲四当成活四。）
 */
function hasOpenFourThrough(
  board: number[][],
  row: number,
  col: number,
  player: AiPlayer
): boolean {
  const size = board.length
  for (const [dr, dc] of LINE_DIRS) {
    let count = 1
    let r = row + dr
    let c = col + dc
    while (r >= 0 && c >= 0 && r < size && c < size && board[r]![c] === player) {
      count++
      r += dr
      c += dc
    }
    const open1 = r >= 0 && c >= 0 && r < size && c < size && board[r]![c] === 0
    r = row - dr
    c = col - dc
    while (r >= 0 && c >= 0 && r < size && c < size && board[r]![c] === player) {
      count++
      r -= dr
      c -= dc
    }
    const open2 = r >= 0 && c >= 0 && r < size && c < size && board[r]![c] === 0
    if (count === 4 && open1 && open2) return true
  }
  return false
}

/** 落子后形成活四的点 */
export function findOpenFourMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    const ok = hasOpenFourThrough(board, m.row, m.col, player)
    board[m.row]![m.col] = 0
    if (ok) out.push(m)
  }
  return out
}

/**
 * 双活四叉：落子后盘面至少有两个不同的活四可走点（对方无法一手全堵）。
 */
export function findForkThreeMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    const openFours = findOpenFourMoves(board, player, rules, radius).length
    board[m.row]![m.col] = 0
    if (openFours >= 2) out.push(m)
  }
  return out
}

/**
 * 当前行棋方必须优先考虑的防守点（收紧，避免「假必防」）：
 * 1) 对方一步胜；
 * 2) 对方已有活四；
 * 3) 对方「双活四叉」成杀点（如下 (7,4) 可同时造两点活四）——优先于散装冲四；
 * 4) 否则对方冲四点（单冲四预备）。
 */
export function listForcedReplies(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const opp = other(toPlay)
  const immediate = findWinningMoves(board, opp, rules, radius)
  if (immediate.length > 0) return uniqueMoves(immediate)

  const openFours = findOpenFourMoves(board, opp, rules, radius)
  if (openFours.length > 0) {
    // 只堵活四落点（活三两端）；不要把「活四之后的胜点」也算进当前必防
    return uniqueMoves(openFours)
  }

  // 双活四 / 双杀叉：必须先占，否则对方一手造成两点活四
  const forks = findForkThreeMoves(board, opp, rules, radius)
  if (forks.length > 0) return uniqueMoves(forks)

  const fours = findFourThreatMoves(board, opp, rules, radius)
  if (fours.length > 0) {
    const blocks: AiMove[] = [...fours]
    for (const f of fours) {
      board[f.row]![f.col] = opp
      blocks.push(...findWinningMoves(board, opp, rules, radius))
      board[f.row]![f.col] = 0
    }
    return uniqueMoves(blocks)
  }

  return []
}

/**
 * 堵完后对方残留双活四威胁的「严重度」：叉点数、下一手最多可造活四数、活四总和。
 */
function remainingForkSeverity(
  board: number[][],
  attacker: AiPlayer,
  rules: RuleSetId,
  radius: number
): { forks: number; maxOF: number; sumOF: number; openLeft: number } {
  const forks = findForkThreeMoves(board, attacker, rules, radius)
  let maxOF = 0
  let sumOF = 0
  for (const f of forks) {
    board[f.row]![f.col] = attacker
    const n = findOpenFourMoves(board, attacker, rules, radius).length
    board[f.row]![f.col] = 0
    maxOF = Math.max(maxOF, n)
    sumOF += n
  }
  const openLeft = findOpenFourMoves(board, attacker, rules, radius).length
  return { forks: forks.length, maxOF, sumOF, openLeft }
}

/**
 * 在必防点中选堵完后对方残留双活四威胁最轻的点。
 * 同分按 (row,col) 稳定打破，避免随机抽到仍放行明显杀点的叉。
 */
export function pickBestForcedReply(
  board: number[][],
  toPlay: AiPlayer,
  candidates: AiMove[],
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]!
  const opp = other(toPlay)
  let best: AiMove | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const m of candidates) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = toPlay
    const s = remainingForkSeverity(board, opp, rules, radius)
    board[m.row]![m.col] = 0
    // 行/列作稳定平局键，保证同严重度时结果可复现
    const score =
      s.forks * 1_000_000 + s.maxOF * 10_000 + s.sumOF * 100 + s.openLeft * 10 + m.row + m.col / 100
    if (score < bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/** 进攻威胁 ∪ 防守点，供搜索展开（不含全盘活三叉枚举，以免拖垮时限） */
export function listThreatCandidates(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  return uniqueMoves([
    ...findWinningMoves(board, toPlay, rules, radius),
    ...listForcedReplies(board, toPlay, rules, radius),
    ...findOpenFourMoves(board, toPlay, rules, radius),
    ...findFourThreatMoves(board, toPlay, rules, radius),
  ])
}

/**
 * 短威胁搜索：在只扩展「冲四 / 必防」的前提下，找强迫胜的一手。
 * 找不到返回 null。
 */
export function findForcedWinMove(
  board: number[][],
  player: AiPlayer,
  maxPly: number,
  rules: RuleSetId = DEFAULT_RULE_SET,
  shouldAbort?: () => boolean,
  radius = NEIGHBOR_RADIUS
): AiMove | null {
  if (maxPly <= 0) return null
  const wins = findWinningMoves(board, player, rules, radius)
  if (wins.length > 0) return wins[0]!

  const attacks = uniqueMoves([
    ...findOpenFourMoves(board, player, rules, radius),
    ...findFourThreatMoves(board, player, rules, radius),
  ])

  for (const m of attacks) {
    if (shouldAbort?.()) return null
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      return m
    }
    const ok = forcedWinAfter(board, player, maxPly - 1, rules, shouldAbort, radius)
    board[m.row]![m.col] = 0
    if (ok) return m
  }
  return null
}

function forcedWinAfter(
  board: number[][],
  ai: AiPlayer,
  plyLeft: number,
  rules: RuleSetId,
  shouldAbort: (() => boolean) | undefined,
  radius: number
): boolean {
  if (plyLeft <= 0 || shouldAbort?.()) return false

  const toPlay = nextPlayerFromBoard(board)

  if (toPlay === ai) {
    if (findWinningMoves(board, ai, rules, radius).length > 0) return true
    const attacks = findFourThreatMoves(board, ai, rules, radius)
    for (const m of attacks) {
      if (shouldAbort?.()) return false
      board[m.row]![m.col] = ai
      const win =
        checkWinner(board, m.row, m.col, rules) === ai ||
        forcedWinAfter(board, ai, plyLeft - 1, rules, shouldAbort, radius)
      board[m.row]![m.col] = 0
      if (win) return true
    }
    return false
  }

  if (findWinningMoves(board, toPlay, rules, radius).length > 0) return false
  const replies = listForcedReplies(board, toPlay, rules, radius)
  if (replies.length === 0) return false

  for (const r of replies) {
    if (shouldAbort?.()) return false
    if (board[r.row]![r.col] !== 0) continue
    board[r.row]![r.col] = toPlay
    const still = forcedWinAfter(board, ai, plyLeft - 1, rules, shouldAbort, radius)
    board[r.row]![r.col] = 0
    if (!still) return false
  }
  return true
}
