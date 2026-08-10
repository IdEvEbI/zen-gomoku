/**
 * VCF（Victory by Continuous Four）求解器
 *
 * 攻方只扩展冲四/活四类强迫着；守方**只堵当前胜点**（不扩活三软防）。
 * 双胜点（≥2）视为攻方已胜。显式 sideToMove，便于防守假想检测。
 *
 * 性能：进攻分支按胜点数排序并截断；节点置换；无冲四则立刻失败。
 */

import { checkWinner } from '../core'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'
import type { AiMove, AiPlayer } from './types'
import { findFourThreatMoves, findWinningMoves } from './threats'

const NEIGHBOR_RADIUS = 2

/** 默认半步深度（攻守各计） */
export const DEFAULT_VCF_MAX_PLY = 12

/** 同一节点最多尝试的进攻着（双杀优先已排序） */
const MAX_ATTACK_BRANCH = 8

/** 单次求解最多展开节点，防止无解局面拖死主线程 */
const DEFAULT_MAX_NODES = 8_000

export interface VcfOptions {
  maxPly?: number
  rules?: RuleSetId
  radius?: number
  shouldAbort?: () => boolean
  /** 覆盖默认节点上限 */
  maxNodes?: number
}

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

/** 粗粒度局面键（仅已占子） */
function boardKey(board: number[][], attacker: AiPlayer, side: AiPlayer, plyLeft: number): string {
  const parts: string[] = [`${attacker}|${side}|${plyLeft}`]
  for (let r = 0; r < board.length; r++) {
    const row = board[r]!
    for (let c = 0; c < row.length; c++) {
      const v = row[c]!
      if (v === 1 || v === 2) parts.push(`${r},${c},${v}`)
    }
  }
  return parts.join(';')
}

/**
 * 进攻着排序：胜点越多越优先；截断分支。
 */
function orderedAttackMoves(
  board: number[][],
  attacker: AiPlayer,
  rules: RuleSetId,
  radius: number
): AiMove[] {
  const instant = findWinningMoves(board, attacker, rules, radius)
  if (instant.length > 0) return instant

  const raw = findFourThreatMoves(board, attacker, rules, radius)
  if (raw.length === 0) return []

  const scored: Array<{ m: AiMove; wins: number }> = []
  for (const m of raw) {
    board[m.row]![m.col] = attacker
    if (checkWinner(board, m.row, m.col, rules) === attacker) {
      board[m.row]![m.col] = 0
      scored.push({ m, wins: 99 })
      continue
    }
    const wins = findWinningMoves(board, attacker, rules, radius).length
    board[m.row]![m.col] = 0
    if (wins > 0) scored.push({ m, wins })
  }
  scored.sort((a, b) => b.wins - a.wins)
  return scored.slice(0, MAX_ATTACK_BRANCH).map((s) => s.m)
}

/**
 * 从给定行棋方起，攻方能否靠连续冲四逼杀。
 */
export function vcfExists(
  board: number[][],
  attacker: AiPlayer,
  sideToMove: AiPlayer,
  options: VcfOptions = {}
): boolean {
  const maxPly = options.maxPly ?? DEFAULT_VCF_MAX_PLY
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  const cache = new Map<string, boolean>()
  const nodes = { n: 0 }
  return search(
    board,
    attacker,
    sideToMove,
    maxPly,
    rules,
    radius,
    options.shouldAbort,
    cache,
    nodes,
    maxNodes
  )
}

function search(
  board: number[][],
  attacker: AiPlayer,
  side: AiPlayer,
  plyLeft: number,
  rules: RuleSetId,
  radius: number,
  shouldAbort: (() => boolean) | undefined,
  cache: Map<string, boolean>,
  nodes: { n: number },
  maxNodes: number
): boolean {
  if (plyLeft <= 0 || shouldAbort?.()) return false
  if (nodes.n >= maxNodes) return false
  nodes.n++

  const key = boardKey(board, attacker, side, plyLeft)
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  let result: boolean
  if (side === attacker) {
    result = attackNode(
      board,
      attacker,
      plyLeft,
      rules,
      radius,
      shouldAbort,
      cache,
      nodes,
      maxNodes
    )
  } else {
    result = defendNode(
      board,
      attacker,
      plyLeft,
      rules,
      radius,
      shouldAbort,
      cache,
      nodes,
      maxNodes
    )
  }
  cache.set(key, result)
  return result
}

function attackNode(
  board: number[][],
  attacker: AiPlayer,
  plyLeft: number,
  rules: RuleSetId,
  radius: number,
  shouldAbort: (() => boolean) | undefined,
  cache: Map<string, boolean>,
  nodes: { n: number },
  maxNodes: number
): boolean {
  const attacks = orderedAttackMoves(board, attacker, rules, radius)
  for (const m of attacks) {
    if (shouldAbort?.() || nodes.n >= maxNodes) return false
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = attacker
    const won =
      checkWinner(board, m.row, m.col, rules) === attacker ||
      search(
        board,
        attacker,
        other(attacker),
        plyLeft - 1,
        rules,
        radius,
        shouldAbort,
        cache,
        nodes,
        maxNodes
      )
    board[m.row]![m.col] = 0
    if (won) return true
  }
  return false
}

function defendNode(
  board: number[][],
  attacker: AiPlayer,
  plyLeft: number,
  rules: RuleSetId,
  radius: number,
  shouldAbort: (() => boolean) | undefined,
  cache: Map<string, boolean>,
  nodes: { n: number },
  maxNodes: number
): boolean {
  const defender = other(attacker)

  if (findWinningMoves(board, defender, rules, radius).length > 0) return false

  const winPoints = findWinningMoves(board, attacker, rules, radius)
  if (winPoints.length === 0) return false
  if (winPoints.length >= 2) return true

  const block = winPoints[0]!
  if (board[block.row]![block.col] !== 0) return false
  board[block.row]![block.col] = defender
  const still = search(
    board,
    attacker,
    attacker,
    plyLeft - 1,
    rules,
    radius,
    shouldAbort,
    cache,
    nodes,
    maxNodes
  )
  board[block.row]![block.col] = 0
  return still
}

/**
 * 当前轮到 `player` 时，若存在 VCF，返回首着。
 */
export function findVcfMove(
  board: number[][],
  player: AiPlayer,
  options: VcfOptions = {}
): AiMove | null {
  const maxPly = options.maxPly ?? DEFAULT_VCF_MAX_PLY
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  if (maxPly <= 0 || options.shouldAbort?.()) return null

  const instant = findWinningMoves(board, player, rules, radius)
  if (instant.length > 0) return instant[0]!

  const cache = new Map<string, boolean>()
  const nodes = { n: 0 }
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  const attacks = orderedAttackMoves(board, player, rules, radius)
  for (const m of attacks) {
    if (options.shouldAbort?.() || nodes.n >= maxNodes) return null
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    const won =
      checkWinner(board, m.row, m.col, rules) === player ||
      search(
        board,
        player,
        other(player),
        maxPly - 1,
        rules,
        radius,
        options.shouldAbort,
        cache,
        nodes,
        maxNodes
      )
    board[m.row]![m.col] = 0
    if (won) return m
  }
  return null
}

export function hasVcf(board: number[][], player: AiPlayer, options: VcfOptions = {}): boolean {
  return findVcfMove(board, player, options) !== null
}

/**
 * VCF 必防分析结果。
 * - `none`：对方当前无 VCF
 * - `broken`：存在能打破对方 VCF 的落点
 * - `unavoidable`：对方有 VCF 且候选内无法打破（常已双杀/双 VCF）
 */
export type VcfDefenseAnalysis =
  | { status: 'none'; blocks: [] }
  | { status: 'broken'; blocks: AiMove[] }
  | { status: 'unavoidable'; blocks: [] }

/**
 * 若「轮到对方」时对方有 VCF，分析我方能否打破。
 * 候选优先：对方冲四着与其胜点（避免全盘扫描）。
 */
export function analyzeVcfDefense(
  board: number[][],
  toPlay: AiPlayer,
  options: VcfOptions = {}
): VcfDefenseAnalysis {
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  const opp = other(toPlay)

  const oppFours = findFourThreatMoves(board, opp, rules, radius)
  if (oppFours.length === 0 && findWinningMoves(board, opp, rules, radius).length === 0) {
    return { status: 'none', blocks: [] }
  }

  if (!vcfExists(board, opp, opp, options)) return { status: 'none', blocks: [] }

  const candidates = uniqueMoves([...oppFours, ...findWinningMoves(board, opp, rules, radius)])
  for (const f of oppFours) {
    if (board[f.row]![f.col] !== 0) continue
    board[f.row]![f.col] = opp
    candidates.push(...findWinningMoves(board, opp, rules, radius))
    board[f.row]![f.col] = 0
  }

  const out: AiMove[] = []
  for (const m of uniqueMoves(candidates)) {
    if (options.shouldAbort?.()) break
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = toPlay
    const broken = !vcfExists(board, opp, opp, options)
    board[m.row]![m.col] = 0
    if (broken) out.push(m)
  }
  if (out.length > 0) return { status: 'broken', blocks: out }
  return { status: 'unavoidable', blocks: [] }
}

/**
 * 若「轮到对方」时对方有 VCF，返回我方能打破该 VCF 的落点。
 * 已必负时返回 []；需要区分「无杀 / 可破 / 必负」时用 `analyzeVcfDefense`。
 */
export function findVcfDefense(
  board: number[][],
  toPlay: AiPlayer,
  options: VcfOptions = {}
): AiMove[] {
  const analysis = analyzeVcfDefense(board, toPlay, options)
  return analysis.status === 'broken' ? analysis.blocks : []
}
