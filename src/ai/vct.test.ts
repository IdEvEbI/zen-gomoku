import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { parseGameRecord, rebuildFromRecord } from '../core/gameRecord'
import { findVcfMove, vcfExists } from './vcf'
import { findRushFourIntoForkMove, findVctMove, hasVct, vctExists, findVctDefense } from './vct'
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

  it('short vertical open-three: search may see VCT, root confirm rejects false dual', () => {
    const board = emptyBoard()
    apply(board, [
      [7, 7, 1],
      [7, 8, 2],
      [6, 7, 1],
      [8, 8, 2],
    ])
    // 野心 A 搜索层仍可能证；根确认假双无硬续则不返回
    expect(vctExists(board, 1, 1, { maxPly: 8, maxNodes: 4_000 })).toBe(true)
    expect(findVctMove(board, 1, { maxPly: 8, maxNodes: 4_000 })).toBeNull()
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

  it('gaojiti-220: root prefers hard line, never false rush g6', () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/wuziqi123/gaojiti-220.json', 'utf8')
    ) as unknown
    const parsed = parseGameRecord(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    const { board } = rebuilt
    const allowed = [
      [5, 8], // i10 冲四留叉
      [6, 6], // g9
      [9, 9], // j6
    ]
    const rush = findRushFourIntoForkMove(board, 1)
    expect(rush).not.toBeNull()
    expect(allowed).toContainEqual([rush!.row, rush!.col])
    expect([rush!.row, rush!.col]).not.toEqual([9, 6])
    const t0 = Date.now()
    const phase = planRootPhase(board, 1, {
      vcfMaxPly: 14,
      vctMaxPly: 16,
      vctMaxNodes: 20_000,
      shouldAbortVct: () => Date.now() > t0 + 1_200,
    })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect(allowed).toContainEqual([phase.move.row, phase.move.col])
      expect([phase.move.row, phase.move.col]).not.toEqual([9, 6])
    }
  })

  it('gaojiti-210: rush-four-into-fork g6 at root (VCT may not complete)', () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/wuziqi123/gaojiti-210.json', 'utf8')
    ) as unknown
    const parsed = parseGameRecord(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    const { board } = rebuilt
    const rush = findRushFourIntoForkMove(board, 2)
    expect(rush).not.toBeNull()
    expect([rush!.row, rush!.col]).toEqual([9, 6]) // g6
    const phase = planRootPhase(board, 2, {
      vcfMaxPly: 14,
      vctMaxPly: 16,
      vctMaxNodes: 80_000,
    })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect([phase.move.row, phase.move.col]).toEqual([9, 6])
    }
  })

  it('gaojiti-222: own VCT beats soft fork defense (h7 not h9)', async () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/wuziqi123/gaojiti-222.json', 'utf8')
    ) as unknown
    const parsed = parseGameRecord(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    const { board } = rebuilt
    const phase = planRootPhase(board, 1, {
      vcfMaxPly: 14,
      vctMaxPly: 16,
      vctMaxNodes: 80_000,
    })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect([
        [8, 7], // h7
        [8, 8], // i7
      ]).toContainEqual([phase.move.row, phase.move.col])
      expect([phase.move.row, phase.move.col]).not.toEqual([6, 7]) // h9 soft block
    }
    const agent = createAgentForDifficulty('tang')
    const move = await agent.getNextMove(board.map((r) => r.slice()))
    expect(move).not.toBeNull()
    expect([
      [8, 7],
      [8, 8],
    ]).toContainEqual([move!.row, move!.col])
  }, 15_000)

  it('gaojiti-221: prefers rush-four into fork f10, not false dual l8', () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/wuziqi123/gaojiti-221.json', 'utf8')
    ) as unknown
    const parsed = parseGameRecord(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    const { board } = rebuilt
    // 假双活四不得作为 VCT 首着
    const tConfirm = Date.now()
    const vct = findVctMove(board, 1, {
      maxPly: 12,
      maxNodes: 8_000,
      shouldAbort: () => Date.now() > tConfirm + 800,
    })
    if (vct) {
      expect([vct.row, vct.col]).not.toEqual([7, 11]) // l8
    }
    const rush = findRushFourIntoForkMove(board, 1)
    expect(rush).not.toBeNull()
    expect([rush!.row, rush!.col]).toEqual([5, 5]) // f10
    expect([rush!.row, rush!.col]).not.toEqual([7, 11])
    const t0 = Date.now()
    const phase = planRootPhase(board, 1, {
      vcfMaxPly: 14,
      vctMaxPly: 16,
      vctMaxNodes: 20_000,
      shouldAbortVct: () => Date.now() > t0 + 1_200,
    })
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect([phase.move.row, phase.move.col]).toEqual([5, 5])
      expect([phase.move.row, phase.move.col]).not.toEqual([7, 11])
    }
  })
})
