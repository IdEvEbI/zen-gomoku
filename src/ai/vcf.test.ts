import { describe, it, expect } from 'vitest'
import { findVcfMove, hasVcf, vcfExists, findVcfDefense } from './vcf'
import { findOpenFourMoves } from './threats'
import { planRootPhase } from './rootPolicy'
import { createAgentForDifficulty } from './difficulty'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function apply(board: number[][], moves: Array<[number, number, number]>) {
  for (const [r, c, p] of moves) board[r]![c] = p
}

describe('vcf', () => {
  it('findVcfMove: open-four (dual win points) is VCF', () => {
    const board = emptyBoard()
    apply(board, [
      [7, 7, 2],
      [7, 8, 2],
      [7, 9, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [1, 0, 1],
    ])
    const move = findVcfMove(board, 2, { maxPly: 8 })
    expect(move).not.toBeNull()
    expect(move!.row).toBe(7)
    expect([6, 10]).toContain(move!.col)
    expect(hasVcf(board, 2, { maxPly: 8 })).toBe(true)
  })

  it('single rush-four that can be blocked is NOT VCF by itself', () => {
    const board = emptyBoard()
    // 左堵：●○○○· — 白走右成单冲四，黑堵后无续，不构成 VCF
    apply(board, [
      [7, 4, 1],
      [7, 5, 2],
      [7, 6, 2],
      [7, 7, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 2],
      [0, 3, 1],
    ])
    expect(vcfExists(board, 2, 2, { maxPly: 8 })).toBe(false)
    expect(findVcfMove(board, 2, { maxPly: 8 })).toBeNull()
  })

  it('findVcfDefense: spoil unique open-four starter', () => {
    // 仅一侧可成活四：左堵，右端唯一开四着 —— 但对单冲四 VCF 为假。
    // 改用「缺口活四」：○○·○ 中间一点是唯一成活四着。
    const board = emptyBoard()
    apply(board, [
      [7, 5, 2],
      [7, 6, 2],
      [7, 8, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [1, 0, 1],
    ])
    const ofs = findOpenFourMoves(board, 2)
    expect(ofs.some((m) => m.row === 7 && m.col === 7)).toBe(true)
    expect(vcfExists(board, 2, 2, { maxPly: 6 })).toBe(true)

    // 黑占 7,7 后白无法再走该开四
    board[7]![7] = 1
    expect(vcfExists(board, 2, 2, { maxPly: 6 })).toBe(false)
    board[7]![7] = 0

    const blocks = findVcfDefense(board, 1, { maxPly: 6 })
    expect(blocks.some((m) => m.row === 7 && m.col === 7)).toBe(true)
  })

  it('planRootPhase: terminals on own VCF', () => {
    const board = emptyBoard()
    apply(board, [
      [7, 7, 2],
      [7, 8, 2],
      [7, 9, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [1, 0, 1],
    ])
    const phase = planRootPhase(board, 2, { vcfMaxPly: 8 })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect(phase.move.row).toBe(7)
      expect([6, 10]).toContain(phase.move.col)
    }
  })

  it('planRootPhase: terminals on VCF defense', () => {
    const board = emptyBoard()
    apply(board, [
      [7, 5, 2],
      [7, 6, 2],
      [7, 8, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [1, 0, 1],
    ])
    const blocks = findVcfDefense(board, 1, { maxPly: 8 })
    expect(blocks.length).toBeGreaterThan(0)
    const phase = planRootPhase(board, 1, { vcfMaxPly: 8 })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect(blocks.some((m) => m.row === phase.move.row && m.col === phase.move.col)).toBe(true)
    }
  })

  it('tang agent still returns a legal move under VCF budget', async () => {
    const board = emptyBoard()
    apply(board, [
      [7, 7, 1],
      [7, 8, 2],
      [6, 7, 1],
      [8, 8, 2],
    ])
    const agent = createAgentForDifficulty('tang')
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect(board[move!.row]![move!.col]).toBe(0)
  }, 15_000)
})
