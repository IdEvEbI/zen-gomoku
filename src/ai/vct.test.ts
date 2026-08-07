import { describe, it, expect } from 'vitest'
import { findVcfMove, vcfExists } from './vcf'
import { findVctMove, hasVct, vctExists, findVctDefense } from './vct'
import { findOpenFourMoves, findOpenThreeMoves } from './threats'
import { planRootPhase } from './rootPolicy'
import { createAgentForDifficulty } from './difficulty'

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function apply(board: number[][], moves: Array<[number, number, number]>) {
  for (const [r, c, p] of moves) board[r]![c] = p
}

describe('vct', () => {
  it('covers VCF positions (open-four dual)', () => {
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
    const vcf = findVcfMove(board, 2, { maxPly: 8 })
    const vct = findVctMove(board, 2, { maxPly: 8 })
    expect(vcf).not.toBeNull()
    expect(vct).not.toBeNull()
    expect(vct!.row).toBe(vcf!.row)
    expect(vct!.col).toBe(vcf!.col)
    expect(hasVct(board, 2, { maxPly: 8 })).toBe(true)
  })

  it('finds short VCT that is not a root VCF (open-three line)', () => {
    const board = emptyBoard()
    apply(board, [
      [8, 7, 2],
      [8, 8, 2],
      [6, 10, 2],
      [7, 10, 2],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [1, 0, 1],
      [1, 1, 2],
      [2, 0, 1],
    ])
    expect(findOpenThreeMoves(board, 2).length).toBeGreaterThan(0)
    expect(vcfExists(board, 2, 2, { maxPly: 10 })).toBe(false)
    expect(vctExists(board, 2, 2, { maxPly: 12, maxNodes: 8_000 })).toBe(true)
    const move = findVctMove(board, 2, { maxPly: 12, maxNodes: 8_000 })
    expect(move).not.toBeNull()
  })

  it('detects fork VCT on short vertical shape', () => {
    const board = emptyBoard()
    apply(board, [
      [7, 7, 1],
      [7, 8, 2],
      [6, 7, 1],
      [8, 8, 2],
    ])
    expect(findVctMove(board, 1, { maxPly: 8, maxNodes: 4_000 })).not.toBeNull()
  })

  it('returns null on sparse unrelated stones', () => {
    const board = emptyBoard()
    apply(board, [
      [1, 1, 1],
      [13, 13, 2],
      [1, 13, 1],
      [13, 1, 2],
    ])
    expect(findVctMove(board, 1, { maxPly: 4, maxNodes: 1_000 })).toBeNull()
  })

  it('planRootPhase: own VCF beats soft open-four defense', () => {
    const board = emptyBoard()
    apply(board, [
      [7, 7, 2],
      [7, 8, 2],
      [7, 9, 2],
      [5, 5, 1],
      [5, 6, 1],
      [5, 7, 1],
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
    ])
    expect(findOpenFourMoves(board, 1).length).toBeGreaterThan(0)
    expect(findVcfMove(board, 2, { maxPly: 8 })).not.toBeNull()

    const phase = planRootPhase(board, 2, { vcfMaxPly: 8, vctMaxPly: 8 })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect(phase.move.row).toBe(7)
      expect([6, 10]).toContain(phase.move.col)
    }
  })

  it('planRootPhase: terminals on VCT defense when opp has VCT', () => {
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
    expect(vctExists(board, 2, 2, { maxPly: 8 })).toBe(true)
    const blocks = findVctDefense(board, 1, { maxPly: 8 })
    expect(blocks.length).toBeGreaterThan(0)
    const phase = planRootPhase(board, 1, { vcfMaxPly: 8, vctMaxPly: 8 })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect(blocks.some((m) => m.row === phase.move.row && m.col === phase.move.col)).toBe(true)
    }
  })

  it('regression: after black (7,9) white must rush-four not soft-block wrong fork', async () => {
    // 来自 zen-gomoku-2026-08-07-10-17-10：漏挡后黑双活三；正确应 (6,4)/(6,3) 冲四抢先
    const board = emptyBoard()
    apply(board, [
      [7, 7, 1],
      [6, 7, 2],
      [8, 8, 1],
      [6, 6, 2],
      [8, 9, 1],
      [6, 5, 2],
      [6, 8, 1],
      [5, 9, 2],
      [7, 9, 1],
    ])
    expect(findVctMove(board, 2, { maxPly: 12, maxNodes: 8_000 })).toBeNull()
    const phase = planRootPhase(board, 2, { vcfMaxPly: 12, vctMaxPly: 12 })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect([
        [6, 3],
        [6, 4],
      ]).toContainEqual([phase.move.row, phase.move.col])
    }
    const agent = createAgentForDifficulty('tang')
    const move = await agent.getNextMove(board)
    expect(move).not.toBeNull()
    expect([
      [6, 3],
      [6, 4],
    ]).toContainEqual([move!.row, move!.col])
  }, 15_000)
})
