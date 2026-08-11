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
 * 已落子 (row,col) 在某一方向是否形成活四：恰好 4 连且两端皆空。
 * （避免用「全局胜点 ≥2」误把多个无关冲四当成活四。）
 */
function hasOpenFourThrough(
  board: number[][],
  row: number,
  col: number,
  player: AiPlayer
): boolean {
  for (const [dr, dc] of LINE_DIRS) {
    if (openFourInDirection(board, row, col, player, dr, dc)) return true
  }
  return false
}

/** 单方向活四：从 (row,col) 沿 ±(dr,dc) 恰好 4 连且两端空 */
function openFourInDirection(
  board: number[][],
  row: number,
  col: number,
  player: AiPlayer,
  dr: number,
  dc: number
): boolean {
  const size = board.length
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
  return count === 4 && open1 && open2
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
 * 双活四 / 双杀叉：落子后形成对方无法一手化解的复合威胁。
 * - 该子至少两个方向成活四；或
 * - 相对落子前，新增 ≥2 个「可成活四点」；或
 * - 已有冲四胜点且同时新增 ≥1 个可成活四点（冲四+活三）。
 *
 * 不可用「盘上可成活四点总数 ≥2」：已有活三两端会把几乎所有空位污染成假叉。
 */
export function findForkThreeMoves(
  board: number[][],
  player: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const beforeOF = new Set(findOpenFourMoves(board, player, rules, radius).map((m) => moveKey(m)))
  const out: AiMove[] = []
  for (const m of candidatePool(board, player, rules, radius)) {
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    if (checkWinner(board, m.row, m.col, rules) === player) {
      board[m.row]![m.col] = 0
      continue
    }
    let dirs = 0
    for (const [dr, dc] of LINE_DIRS) {
      if (openFourInDirection(board, m.row, m.col, player, dr, dc)) dirs++
    }
    const wins = findWinningMoves(board, player, rules, radius).length
    const newOF = findOpenFourMoves(board, player, rules, radius).filter(
      (x) => !beforeOF.has(moveKey(x))
    ).length
    board[m.row]![m.col] = 0
    if (dirs >= 2 || newOF >= 2 || (wins >= 1 && newOF >= 1)) out.push(m)
  }
  return out
}

/**
 * 硬必防：对方下一步可胜（含已有活四/冲四的胜点）。漏则立即负。
 * 仅此类可在根节点短路返回。
 */
export function listHardForcedReplies(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  return uniqueMoves(findWinningMoves(board, other(toPlay), rules, radius))
}

/**
 * 软防守候选（互斥分层，供搜索限制 / 启发必应）：
 * 1) 可成活四（活三端）— 漏则对方成活四；
 * 2) 双杀叉；
 * 3) 冲四预备。
 */
export function listSoftDefenseCandidates(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const opp = other(toPlay)

  const openFourEnds = findOpenFourMoves(board, opp, rules, radius)
  if (openFourEnds.length > 0) return uniqueMoves(openFourEnds)

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
 * 硬必防 ∪ 软防守（猪八戒/沙和尚/威胁 DFS 兼容）。
 * 顺序：硬 → 叉 → 活三端 → 冲四。
 */
export function listForcedReplies(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const hard = listHardForcedReplies(board, toPlay, rules, radius)
  if (hard.length > 0) return hard
  return listSoftDefenseCandidates(board, toPlay, rules, radius)
}

/**
 * 攻方在当前盘面的残留威胁（守方视角：越大越糟）。
 *
 * 紧迫级（高 → 低）：胜点 → 多活四端 → 可放多活四苗的残留叉数（模式 M）→
 * 活四双胜杀伤 → 叉双杀 → 叉数。
 * 评分与择优统一走这套，避免「forkMode / 活三Mode」分叉把双活四排到叉后面。
 */
export interface ThreatResidual {
  /** 攻方下一步可胜点数 */
  winPoints: number
  /** 攻方可成活四（活三端）点数 */
  openFourMoves: number
  /** 各活四端落下后的胜点总数 */
  openFourDualSum: number
  forkCount: number
  /** 最狠残留叉落下后的胜点数 */
  forkMaxWins: number
  /** 最狠残留叉的活四双胜杀伤 */
  forkMaxDual: number
  forkMaxOF: number
  forkSumOF: number
  /**
   * 落下后出现 ≥2 活四苗的残留叉个数（一手无法兼顾）。
   * 模式 M：挡「放一窝」时优先压低此项，勿被较低 forkMaxDual 带偏。
   */
  forkMultiOfCount: number
}

/**
 * 测量攻方残留威胁。调用方负责局面（通常已试下守方着）。
 */
export function measureThreatResidual(
  board: number[][],
  attacker: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): ThreatResidual {
  const winPoints = findWinningMoves(board, attacker, rules, radius).length
  const openFours = findOpenFourMoves(board, attacker, rules, radius)
  let openFourDualSum = 0
  for (const e of openFours) {
    board[e.row]![e.col] = attacker
    openFourDualSum += findWinningMoves(board, attacker, rules, radius).length
    board[e.row]![e.col] = 0
  }

  const forks = findForkThreeMoves(board, attacker, rules, radius)
  let forkMaxOF = 0
  let forkSumOF = 0
  let forkMaxDual = 0
  let forkMaxWins = 0
  let forkMultiOfCount = 0
  for (const f of forks) {
    board[f.row]![f.col] = attacker
    const ofs = findOpenFourMoves(board, attacker, rules, radius)
    const wins = findWinningMoves(board, attacker, rules, radius).length
    let dual = 0
    for (const e of ofs) {
      board[e.row]![e.col] = attacker
      dual += findWinningMoves(board, attacker, rules, radius).length
      board[e.row]![e.col] = 0
    }
    board[f.row]![f.col] = 0
    forkMaxOF = Math.max(forkMaxOF, ofs.length)
    forkSumOF += ofs.length
    forkMaxDual = Math.max(forkMaxDual, dual)
    forkMaxWins = Math.max(forkMaxWins, wins)
    if (ofs.length >= 2) forkMultiOfCount += 1
  }

  return {
    winPoints,
    openFourMoves: openFours.length,
    openFourDualSum,
    forkCount: forks.length,
    forkMaxWins,
    forkMaxDual,
    forkMaxOF,
    forkSumOF,
    forkMultiOfCount,
  }
}

/**
 * 残留威胁标量（越小越好）。位权保证紧迫级不会被低级项淹没。
 */
export function scoreThreatResidual(r: ThreatResidual): number {
  return (
    r.winPoints * 1_000_000_000_000 +
    // 残留 ≥2 活四端：一手无法兼顾，高于任何单叉
    (r.openFourMoves >= 2 ? 100_000_000_000 : 0) +
    r.openFourMoves * 1_000_000_000 +
    r.openFourDualSum * 10_000_000 +
    (r.forkMaxWins >= 2 ? r.forkMaxWins * 1_000_000 : 0) +
    r.forkMaxDual * 100_000 +
    // 模式 M：每个「叉→≥2 活四苗」与 1 档 forkMaxDual 同阶，累加可压过「低 dual、多窝」
    r.forkMultiOfCount * 100_000 +
    r.forkMaxOF * 1_000 +
    r.forkCount * 10 +
    r.forkSumOF
  )
}

function isOwnAttackPoint(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId,
  radius: number
): { fork: boolean; openFour: boolean; four: boolean } {
  const hit = (ms: AiMove[]) => ms.some((m) => m.row === move.row && m.col === move.col)
  return {
    fork: hit(findForkThreeMoves(board, toPlay, rules, radius)),
    openFour: hit(findOpenFourMoves(board, toPlay, rules, radius)),
    four: hit(findFourThreatMoves(board, toPlay, rules, radius)),
  }
}

/**
 * 落子后己方叉/活四杀伤（越大越犀利）。
 * 若落子后对方已有胜点则返回负值（不能抢攻）。
 */
export function measureAttackLethality(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): number {
  if (board[move.row]![move.col] !== 0) return Number.NEGATIVE_INFINITY
  const opp = other(toPlay)
  board[move.row]![move.col] = toPlay
  const oppWins = findWinningMoves(board, opp, rules, radius).length
  if (oppWins > 0) {
    board[move.row]![move.col] = 0
    return Number.NEGATIVE_INFINITY
  }
  const ofs = findOpenFourMoves(board, toPlay, rules, radius)
  let dual = 0
  for (const e of ofs) {
    board[e.row]![e.col] = toPlay
    dual += findWinningMoves(board, toPlay, rules, radius).length
    board[e.row]![e.col] = 0
  }
  const ofCount = ofs.length
  board[move.row]![move.col] = 0
  return dual * 1_000 + ofCount * 10
}

/**
 * 落子后己方持续压迫（活三数、残余杀伤），用于同档防守下偏「边消边造」。
 * 量级远小于 ofDualSum/maxDual，不会用进攻换漏防。
 */
function ownPressureBonus(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId,
  radius: number
): number {
  const L = measureAttackLethality(board, toPlay, move, rules, radius)
  if (!Number.isFinite(L) || L < 0) return 0
  board[move.row]![move.col] = toPlay
  const openThrees = findOpenThreeMoves(board, toPlay, rules, radius).length
  const fours = findFourThreatMoves(board, toPlay, rules, radius).length
  board[move.row]![move.col] = 0
  return Math.min(400, L / 25) + openThrees * 12 + fours * 20
}

/**
 * 必防点评分（越小越好）。
 * 主序：`measureThreatResidual` 紧迫级；同档才用兼攻 / 坐标作 tie-break。
 */
export function scoreForcedReply(
  board: number[][],
  toPlay: AiPlayer,
  move: AiMove,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): number {
  if (board[move.row]![move.col] !== 0) return Number.POSITIVE_INFINITY
  const opp = other(toPlay)
  const own = isOwnAttackPoint(board, toPlay, move, rules, radius)
  const pressure = ownPressureBonus(board, toPlay, move, rules, radius)

  board[move.row]![move.col] = toPlay
  const residual = measureThreatResidual(board, opp, rules, radius)
  board[move.row]![move.col] = 0

  const tie =
    move.row +
    move.col / 100 -
    (own.fork ? 2_000 : 0) -
    (own.openFour ? 1_000 : 0) -
    (own.four ? 100 : 0) -
    pressure
  return scoreThreatResidual(residual) + tie
}

/**
 * 在必防点中选评分最优的点（见 scoreForcedReply）。
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
  let best: AiMove | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const m of candidates) {
    const score = scoreForcedReply(board, toPlay, m, rules, radius)
    if (score < bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/** 进攻威胁 ∪ 硬/软防守，供搜索展开 */
export function listThreatCandidates(
  board: number[][],
  toPlay: AiPlayer,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  return uniqueMoves([
    ...findWinningMoves(board, toPlay, rules, radius),
    ...listHardForcedReplies(board, toPlay, rules, radius),
    ...listSoftDefenseCandidates(board, toPlay, rules, radius),
    ...findOpenFourMoves(board, toPlay, rules, radius),
    ...findForkThreeMoves(board, toPlay, rules, radius),
    ...findFourThreatMoves(board, toPlay, rules, radius),
  ])
}

/**
 * 软威胁局面的根搜索候选：兼攻点优先，再软挡、再纯进攻；软挡点必须保留。
 * 无软威胁时返回 []（调用方走全盘搜索）。
 */
export function listSoftRootCandidates(
  board: number[][],
  toPlay: AiPlayer,
  limit = 16,
  rules: RuleSetId = DEFAULT_RULE_SET,
  radius = NEIGHBOR_RADIUS
): AiMove[] {
  const soft = listSoftDefenseCandidates(board, toPlay, rules, radius)
  if (soft.length === 0) return []
  const attacks = uniqueMoves([
    ...findOpenFourMoves(board, toPlay, rules, radius),
    ...findForkThreeMoves(board, toPlay, rules, radius),
    ...findFourThreatMoves(board, toPlay, rules, radius),
  ])
  const atkKeys = new Set(attacks.map(moveKey))
  const both = soft.filter((m) => atkKeys.has(moveKey(m)))
  const softOnly = soft.filter((m) => !atkKeys.has(moveKey(m)))
  const softKeys = new Set(soft.map(moveKey))
  const atkOnly = attacks.filter((m) => !softKeys.has(moveKey(m)))
  const ordered = uniqueMoves([...both, ...softOnly, ...atkOnly])
  if (ordered.length <= limit) return ordered
  const rest = ordered.filter((m) => !softKeys.has(moveKey(m)))
  return uniqueMoves([...soft, ...rest.slice(0, Math.max(0, limit - soft.length))])
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
