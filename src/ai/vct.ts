/**
 * VCT（Victory by Continuous Threats）求解器
 *
 * 攻方扩展冲四 + 活三 + 叉；守方枚举必应挡点（AND）。
 * 冲四收窄局面复用 `vcfExists` / `findVcfMove`。见 docs/design/vct.md。
 */

import { checkWinner } from '../core'
import { DEFAULT_RULE_SET, type RuleSetId } from '../core/rules'
import type { AiMove, AiPlayer } from './types'
import {
  findForkThreeMoves,
  findFourThreatMoves,
  findOpenFourMoves,
  findOpenThreeMoves,
  findWinningMoves,
} from './threats'
import { findVcfDefense, findVcfMove, vcfExists, type VcfOptions } from './vcf'

const NEIGHBOR_RADIUS = 2

/** 默认半步深度（攻守各计） */
export const DEFAULT_VCT_MAX_PLY = 12

const DEFAULT_ATTACK_BRANCH = 8
const DEFAULT_DEFENSE_BRANCH = 6
const DEFAULT_MAX_NODES = 8_000

export interface VctOptions {
  maxPly?: number
  rules?: RuleSetId
  radius?: number
  shouldAbort?: () => boolean
  maxNodes?: number
  attackBranch?: number
  defenseBranch?: number
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

/** 嵌套 VCF 共用父级剩余节点，避免每次重置 8k 把时限拖爆 */
function toVcfOptions(
  options: VctOptions,
  maxPly: number,
  parentNodes?: { n: number },
  parentMaxNodes?: number
): VcfOptions {
  const cap = parentMaxNodes ?? options.maxNodes
  const maxNodes =
    parentNodes !== undefined && cap !== undefined ? Math.max(0, cap - parentNodes.n) : cap
  return {
    maxPly,
    rules: options.rules,
    radius: options.radius,
    shouldAbort: options.shouldAbort,
    maxNodes,
  }
}

/**
 * 进攻着排序：双杀/叉 > 冲四 > 活三；截断分支。
 */
function orderedAttackMoves(
  board: number[][],
  attacker: AiPlayer,
  rules: RuleSetId,
  radius: number,
  attackBranch: number
): AiMove[] {
  const instant = findWinningMoves(board, attacker, rules, radius)
  if (instant.length > 0) return instant

  // 先叉/冲四再视情况补活三：全量活三打分在大棋盘上可耗掉整段墙钟预算
  const primary = uniqueMoves([
    ...findForkThreeMoves(board, attacker, rules, radius),
    ...findFourThreatMoves(board, attacker, rules, radius),
  ])
  const scored: Array<{ m: AiMove; score: number }> = []

  const scoreMove = (m: AiMove): number | null => {
    if (board[m.row]![m.col] !== 0) return null
    board[m.row]![m.col] = attacker
    if (checkWinner(board, m.row, m.col, rules) === attacker) {
      board[m.row]![m.col] = 0
      return 10_000
    }
    const wins = findWinningMoves(board, attacker, rules, radius).length
    const openFours = findOpenFourMoves(board, attacker, rules, radius).length
    const fours = findFourThreatMoves(board, attacker, rules, radius).length
    // 双杀启发下跳过昂贵的活三计数
    if (wins >= 2 || openFours >= 2) {
      board[m.row]![m.col] = 0
      return (wins >= 2 ? 8_000 : 5_000) + wins * 100 + openFours * 200
    }
    const threes = findOpenThreeMoves(board, attacker, rules, radius).length
    board[m.row]![m.col] = 0
    if (wins === 0 && openFours === 0 && fours === 0 && threes === 0) return null
    return wins * 500 + openFours * 200 + fours * 40 + threes * 10
  }

  for (const m of primary) {
    const score = scoreMove(m)
    if (score === null) continue
    scored.push({ m, score })
  }

  const hasDualHint = scored.some((s) => s.score >= 5_000)
  if (!hasDualHint && scored.length < attackBranch) {
    const primaryKeys = new Set(primary.map((m) => moveKey(m)))
    for (const m of findOpenThreeMoves(board, attacker, rules, radius)) {
      if (primaryKeys.has(moveKey(m))) continue
      const score = scoreMove(m)
      if (score === null) continue
      scored.push({ m, score })
      if (scored.length >= attackBranch * 2) break
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, attackBranch).map((s) => s.m)
}

export function vctExists(
  board: number[][],
  attacker: AiPlayer,
  sideToMove: AiPlayer,
  options: VctOptions = {}
): boolean {
  const maxPly = options.maxPly ?? DEFAULT_VCT_MAX_PLY
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  const attackBranch = options.attackBranch ?? DEFAULT_ATTACK_BRANCH
  const defenseBranch = options.defenseBranch ?? DEFAULT_DEFENSE_BRANCH
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
    maxNodes,
    attackBranch,
    defenseBranch,
    options
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
  maxNodes: number,
  attackBranch: number,
  defenseBranch: number,
  options: VctOptions
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
      maxNodes,
      attackBranch,
      defenseBranch,
      options
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
      maxNodes,
      attackBranch,
      defenseBranch,
      options
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
  maxNodes: number,
  attackBranch: number,
  defenseBranch: number,
  options: VctOptions
): boolean {
  // VCF ⊆ VCT：有冲四/胜点时先走 VCF，避免盘上另有活三时丢掉短路
  if (
    findWinningMoves(board, attacker, rules, radius).length > 0 ||
    findFourThreatMoves(board, attacker, rules, radius).length > 0
  ) {
    if (vcfExists(board, attacker, attacker, toVcfOptions(options, plyLeft, nodes, maxNodes))) {
      return true
    }
  }

  const tryMoves = orderedAttackMoves(board, attacker, rules, radius, attackBranch)
  const ofBefore = findOpenFourMoves(board, attacker, rules, radius).length
  for (const m of tryMoves) {
    if (shouldAbort?.() || nodes.n >= maxNodes) return false
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = attacker
    // 必须因本手新增强迫（胜/活四/双威胁）；盘上原有冲四点不能为安静着背书
    const forced =
      checkWinner(board, m.row, m.col, rules) === attacker ||
      forcedDefenseBlocks(board, attacker, rules, radius).dual ||
      findWinningMoves(board, attacker, rules, radius).length > 0 ||
      findOpenFourMoves(board, attacker, rules, radius).length > ofBefore
    const won =
      forced &&
      (checkWinner(board, m.row, m.col, rules) === attacker ||
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
          maxNodes,
          attackBranch,
          defenseBranch,
          options
        ))
    board[m.row]![m.col] = 0
    if (won) return true
  }
  return false
}

/**
 * 守方必应点：胜点 → 对方可成活四点 → 对方冲四点。
 * 比 listForcedReplies 更窄，避免把「冲四着 ∪ 其胜点」全部 AND 导致爆炸。
 *
 * 注：可成活四点≥2 作 dual 是野心 A 的约定（活三两端视为不可兼挡），
 * 会把同线活三当成双杀；根上单冲四假杀由 confirmRushFourAttack 收紧。
 */
function forcedDefenseBlocks(
  board: number[][],
  attacker: AiPlayer,
  rules: RuleSetId,
  radius: number
): { dual: boolean; blocks: AiMove[] } {
  const wins = findWinningMoves(board, attacker, rules, radius)
  if (wins.length >= 2) return { dual: true, blocks: [] }
  if (wins.length === 1) return { dual: false, blocks: wins }

  const openFourEnds = findOpenFourMoves(board, attacker, rules, radius)
  if (openFourEnds.length >= 2) return { dual: true, blocks: [] }
  if (openFourEnds.length === 1) return { dual: false, blocks: openFourEnds }

  const fours = findFourThreatMoves(board, attacker, rules, radius)
  if (fours.length === 0) return { dual: false, blocks: [] }
  return { dual: false, blocks: uniqueMoves(fours) }
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
  maxNodes: number,
  attackBranch: number,
  defenseBranch: number,
  options: VctOptions
): boolean {
  const defender = other(attacker)

  if (findWinningMoves(board, defender, rules, radius).length > 0) return false

  const { dual, blocks } = forcedDefenseBlocks(board, attacker, rules, radius)
  if (dual) return true
  if (blocks.length === 0) return false
  if (blocks.length > defenseBranch) return false

  for (const block of blocks) {
    if (shouldAbort?.() || nodes.n >= maxNodes) return false
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
      maxNodes,
      attackBranch,
      defenseBranch,
      options
    )
    board[block.row]![block.col] = 0
    if (!still) return false
  }
  return true
}

/**
 * 根上收紧「单冲四」假杀：挡唯一胜点后须仍有胜点 / 双威胁 / VCF，
 * 不得靠后续假「活三双杀」续命（gaojiti-220 的 g6→h7）。
 * 可成活四点≥2 仍按野心 A 视为双杀，直接放行。
 */
function confirmRootVctAttack(
  board: number[][],
  attacker: AiPlayer,
  move: AiMove,
  options: VctOptions,
  maxPly: number,
  rules: RuleSetId,
  radius: number
): boolean {
  if (board[move.row]![move.col] !== 0) return false
  board[move.row]![move.col] = attacker
  if (checkWinner(board, move.row, move.col, rules) === attacker) {
    board[move.row]![move.col] = 0
    return true
  }
  const wins = findWinningMoves(board, attacker, rules, radius)
  const openFours = findOpenFourMoves(board, attacker, rules, radius)
  if (wins.length >= 2 || openFours.length >= 2) {
    board[move.row]![move.col] = 0
    return true
  }
  if (wins.length !== 1) {
    board[move.row]![move.col] = 0
    return true
  }

  const d = wins[0]!
  const defender = other(attacker)
  if (board[d.row]![d.col] !== 0) {
    board[move.row]![move.col] = 0
    return false
  }
  board[d.row]![d.col] = defender
  const still =
    findWinningMoves(board, attacker, rules, radius).length > 0 ||
    findOpenFourMoves(board, attacker, rules, radius).length >= 2 ||
    vcfExists(board, attacker, attacker, toVcfOptions(options, Math.max(0, maxPly - 1)))
  board[d.row]![d.col] = 0
  board[move.row]![move.col] = 0
  return still
}

/**
 * 当前轮到 `player` 时，若存在 VCT，返回首着。
 */
export function findVctMove(
  board: number[][],
  player: AiPlayer,
  options: VctOptions = {}
): AiMove | null {
  const maxPly = options.maxPly ?? DEFAULT_VCT_MAX_PLY
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  if (maxPly <= 0 || options.shouldAbort?.()) return null

  const instant = findWinningMoves(board, player, rules, radius)
  if (instant.length > 0) return instant[0]!

  // 先 VCF（子集且通常更快）
  const vcfMove = findVcfMove(board, player, toVcfOptions(options, maxPly))
  if (vcfMove) return vcfMove

  const cache = new Map<string, boolean>()
  const nodes = { n: 0 }
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES
  const attackBranch = options.attackBranch ?? DEFAULT_ATTACK_BRANCH
  const defenseBranch = options.defenseBranch ?? DEFAULT_DEFENSE_BRANCH
  const attacks = orderedAttackMoves(board, player, rules, radius, attackBranch)
  const ofBefore = findOpenFourMoves(board, player, rules, radius).length
  for (const m of attacks) {
    if (options.shouldAbort?.() || nodes.n >= maxNodes) return null
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = player
    const forced =
      checkWinner(board, m.row, m.col, rules) === player ||
      forcedDefenseBlocks(board, player, rules, radius).dual ||
      findWinningMoves(board, player, rules, radius).length > 0 ||
      findOpenFourMoves(board, player, rules, radius).length > ofBefore
    const won =
      forced &&
      (checkWinner(board, m.row, m.col, rules) === player ||
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
          maxNodes,
          attackBranch,
          defenseBranch,
          options
        ))
    board[m.row]![m.col] = 0
    if (won && confirmRootVctAttack(board, player, m, options, maxPly, rules, radius)) {
      return m
    }
  }
  return null
}

export function hasVct(board: number[][], player: AiPlayer, options: VctOptions = {}): boolean {
  return findVctMove(board, player, options) !== null
}

/**
 * 若「轮到对方」时对方有 VCT，返回我方能打破该 VCT 的落点。
 */
export function findVctDefense(
  board: number[][],
  toPlay: AiPlayer,
  options: VctOptions = {}
): AiMove[] {
  const rules = options.rules ?? DEFAULT_RULE_SET
  const radius = options.radius ?? NEIGHBOR_RADIUS
  const opp = other(toPlay)

  // 先走廉价 VCF 必防
  const vcfBlocks = findVcfDefense(
    board,
    toPlay,
    toVcfOptions(options, options.maxPly ?? DEFAULT_VCT_MAX_PLY)
  )
  if (vcfBlocks.length > 0) return vcfBlocks

  if (!vctExists(board, opp, opp, options)) return []

  const seeds = uniqueMoves([
    ...findForkThreeMoves(board, opp, rules, radius),
    ...findOpenThreeMoves(board, opp, rules, radius),
    ...forcedDefenseBlocks(board, opp, rules, radius).blocks,
  ]).slice(0, 16)

  const out: AiMove[] = []
  for (const m of seeds) {
    if (options.shouldAbort?.()) break
    if (board[m.row]![m.col] !== 0) continue
    board[m.row]![m.col] = toPlay
    const broken = !vctExists(board, opp, opp, options)
    board[m.row]![m.col] = 0
    if (broken) out.push(m)
  }
  return out
}
