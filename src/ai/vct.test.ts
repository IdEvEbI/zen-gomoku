import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { parseGameRecord, rebuildFromRecord } from '../core/gameRecord'
import { findVcfMove, vcfExists } from './vcf'
import {
  findRushFourIntoForkMove,
  findTrueDualMove,
  findVctMove,
  hasVct,
  vctExists,
  findVctDefense,
} from './vct'
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

  it('academy beginner: true dual / VCT races despite opp soft forks (061, 081–085)', async () => {
    const cases: Array<{ id: string; first: string }> = [
      { id: '061', first: 'i5' },
      { id: '081', first: 'g10' },
      { id: '082', first: 'k7' },
      { id: '083', first: 'j5' },
      { id: '084', first: 'k10' },
      { id: '085', first: 'h7' },
    ]
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    for (const { id, first } of cases) {
      const raw = JSON.parse(
        readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8')
      ) as unknown
      const parsed = parseGameRecord(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const rebuilt = rebuildFromRecord(parsed.record)
      expect('error' in rebuilt).toBe(false)
      if ('error' in rebuilt) return
      const { board, currentPlayer } = rebuilt
      const phase = planRootPhase(
        board.map((r) => r.slice()),
        currentPlayer as 1 | 2,
        {
          vcfMaxPly: 14,
          vctMaxPly: 16,
          vctMaxNodes: 80_000,
        }
      )
      expect(phase.type).toBe('terminal')
      if (phase.type === 'terminal') {
        expect(site(phase.move.row, phase.move.col)).toBe(first)
      }
      const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
      expect(move).not.toBeNull()
      expect(site(move!.row, move!.col)).toBe(first)
    }
  }, 60_000)

  it('playtest: soft OF f8/j4 beats false dual-seed j11 (#91)', async () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/playtests/tang-false-dual-j11-2026-08-11.json', 'utf8')
    ) as unknown
    const parsed = parseGameRecord(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const before = {
      ...parsed.record,
      moves: parsed.record.moves.slice(0, -1),
      status: 'playing' as const,
    }
    const rebuilt = rebuildFromRecord(before)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    const { board, currentPlayer } = rebuilt
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    expect(findTrueDualMove(board, currentPlayer as 1 | 2)).toBeNull()
    const phase = planRootPhase(
      board.map((r) => r.slice()),
      currentPlayer as 1 | 2,
      { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
    )
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      const s = site(phase.move.row, phase.move.col)
      expect(['f8', 'j4']).toContain(s)
      expect(s).not.toBe('j11')
    }
    const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
    expect(move).not.toBeNull()
    const s = site(move!.row, move!.col)
    expect(['f8', 'j4']).toContain(s)
    expect(s).not.toBe('j11')
  }, 15_000)

  it('academy mode G: bare rush-with-fork residual must not terminal (048/076)', async () => {
    const cases: Array<{ id: string; forbidden: string[] }> = [
      { id: '048', forbidden: ['g6'] },
      { id: '076', forbidden: ['e9'] },
    ]
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    for (const { id, forbidden } of cases) {
      const raw = JSON.parse(
        readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8')
      ) as unknown
      const parsed = parseGameRecord(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const rebuilt = rebuildFromRecord(parsed.record)
      expect('error' in rebuilt).toBe(false)
      if ('error' in rebuilt) return
      const { board, currentPlayer } = rebuilt
      const phase = planRootPhase(
        board.map((r) => r.slice()),
        currentPlayer as 1 | 2,
        { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
      )
      if (phase.type === 'terminal') {
        expect(forbidden).not.toContain(site(phase.move.row, phase.move.col))
      }
      const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
      expect(move).not.toBeNull()
      expect(forbidden).not.toContain(site(move!.row, move!.col))
    }
  }, 30_000)

  it('academy mode F: prefer better residual over false VCF/VCT (046 j7)', async () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/academy/beginner/046.json', 'utf8')
    ) as unknown
    const parsed = parseGameRecord(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const rebuilt = rebuildFromRecord(parsed.record)
    expect('error' in rebuilt).toBe(false)
    if ('error' in rebuilt) return
    const { board, currentPlayer } = rebuilt
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    const phase = planRootPhase(
      board.map((r) => r.slice()),
      currentPlayer as 1 | 2,
      { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
    )
    expect(phase.type).toBe('terminal')
    if (phase.type === 'terminal') {
      expect(site(phase.move.row, phase.move.col)).toBe('j7')
      expect(site(phase.move.row, phase.move.col)).not.toBe('j11')
    }
    const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
    expect(move).not.toBeNull()
    expect(site(move!.row, move!.col)).toBe('j7')
  }, 40_000)

  it('academy mode F cont: multi-rush pick (060 d10 / 070 g9)', async () => {
    const cases: Array<{ id: string; first: string; forbidden: string[] }> = [
      { id: '060', first: 'd10', forbidden: ['f12', 'c9', 'j8'] },
      { id: '070', first: 'g9', forbidden: ['h12', 'h10'] },
    ]
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    for (const { id, first, forbidden } of cases) {
      const raw = JSON.parse(
        readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8')
      ) as unknown
      const parsed = parseGameRecord(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const rebuilt = rebuildFromRecord(parsed.record)
      expect('error' in rebuilt).toBe(false)
      if ('error' in rebuilt) return
      const { board, currentPlayer } = rebuilt
      const phase = planRootPhase(
        board.map((r) => r.slice()),
        currentPlayer as 1 | 2,
        { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
      )
      expect(phase.type).toBe('terminal')
      if (phase.type === 'terminal') {
        const s = site(phase.move.row, phase.move.col)
        expect(s).toBe(first)
        expect(forbidden).not.toContain(s)
      }
      const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
      expect(move).not.toBeNull()
      const ms = site(move!.row, move!.col)
      expect(ms).toBe(first)
      expect(forbidden).not.toContain(ms)
    }
  }, 60_000)

  it('academy mode J: attack order / multi-solution prefer first (071/080/074)', async () => {
    const cases: Array<{ id: string; first: string; forbidden: string[] }> = [
      { id: '071', first: 'i9', forbidden: ['h10'] },
      { id: '080', first: 'g6', forbidden: ['i8'] },
      { id: '074', first: 'i6', forbidden: ['h9'] },
    ]
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    for (const { id, first, forbidden } of cases) {
      const raw = JSON.parse(
        readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8')
      ) as unknown
      const parsed = parseGameRecord(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const rebuilt = rebuildFromRecord(parsed.record)
      expect('error' in rebuilt).toBe(false)
      if ('error' in rebuilt) return
      const { board, currentPlayer } = rebuilt
      const phase = planRootPhase(
        board.map((r) => r.slice()),
        currentPlayer as 1 | 2,
        { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
      )
      expect(phase.type).toBe('terminal')
      if (phase.type === 'terminal') {
        const s = site(phase.move.row, phase.move.col)
        expect(s).toBe(first)
        expect(forbidden).not.toContain(s)
      }
      const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
      expect(move).not.toBeNull()
      const ms = site(move!.row, move!.col)
      expect(ms).toBe(first)
      expect(forbidden).not.toContain(ms)
    }
  }, 90_000)

  it('academy mode I: soft-start short VCT order (072/075/077/078/068)', async () => {
    const cases: Array<{ id: string; first: string; forbidden: string[] }> = [
      { id: '072', first: 'g10', forbidden: ['g9', 'i11', 'k12'] },
      { id: '075', first: 'f8', forbidden: ['g7', 'i11'] },
      { id: '077', first: 'e8', forbidden: ['g10', 'j10'] },
      { id: '078', first: 'f5', forbidden: ['f7', 'i7'] },
      { id: '068', first: 'g5', forbidden: ['h6', 'd8'] },
    ]
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    for (const { id, first, forbidden } of cases) {
      const raw = JSON.parse(
        readFileSync(`fixtures/records/academy/beginner/${id}.json`, 'utf8')
      ) as unknown
      const parsed = parseGameRecord(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const rebuilt = rebuildFromRecord(parsed.record)
      expect('error' in rebuilt).toBe(false)
      if ('error' in rebuilt) return
      const { board, currentPlayer } = rebuilt
      const phase = planRootPhase(
        board.map((r) => r.slice()),
        currentPlayer as 1 | 2,
        { vcfMaxPly: 14, vctMaxPly: 16, vctMaxNodes: 80_000 }
      )
      expect(phase.type).toBe('terminal')
      if (phase.type === 'terminal') {
        const s = site(phase.move.row, phase.move.col)
        expect(s).toBe(first)
        expect(forbidden).not.toContain(s)
      }
      const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
      expect(move).not.toBeNull()
      const ms = site(move!.row, move!.col)
      expect(ms).toBe(first)
      expect(forbidden).not.toContain(ms)
    }
  }, 120_000)

  it('mode K soft-squeeze: rush four c7 over soft fork block g8 (#103)', async () => {
    const raw = JSON.parse(
      readFileSync('fixtures/records/playtests/tang-soft-squeeze-2026-08-11-06-16-30.json', 'utf8')
    ) as { moves: Array<{ r: number; c: number; player: number }> }
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    // 白第 14 手之前（前 13 手）
    for (let i = 0; i < 13; i++) {
      const m = raw.moves[i]!
      board[m.r]![m.c] = m.player
    }
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
    expect(move).not.toBeNull()
    const s = site(move!.row, move!.col)
    expect(s).toBe('c7')
    expect(s).not.toBe('g8')
  }, 20_000)

  it('mode L: #12 must not race j9 into mutual VCT (#105)', async () => {
    const raw = JSON.parse(
      readFileSync(
        'fixtures/records/playtests/tang-premature-dual-three-2026-08-11-07-53-01.json',
        'utf8'
      )
    ) as { moves: Array<{ r: number; c: number; player: number }> }
    const board = Array.from({ length: 15 }, () => Array(15).fill(0))
    for (let i = 0; i < 11; i++) {
      const m = raw.moves[i]!
      board[m.r]![m.c] = m.player
    }
    const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
    const phase = planRootPhase(
      board.map((r) => r.slice()),
      2,
      {
        vcfMaxPly: 14,
        vctMaxPly: 16,
        vctMaxNodes: 80_000,
      }
    )
    expect(phase.type).toBe('search')
    if (phase.type === 'search') {
      expect(phase.defenseFloor.length).toBeGreaterThan(0)
      // j9 可在 restrict 攻击侧，但不得作 terminal 抢攻
      expect(phase.defenseFloor.some((m) => site(m.row, m.col) === 'j9')).toBe(false)
    }
    const move = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))
    expect(move).not.toBeNull()
    expect(site(move!.row, move!.col)).not.toBe('j9')
    expect(
      phase.type === 'search' &&
        phase.defenseFloor.some((m) => m.row === move!.row && m.col === move!.col)
    ).toBe(true)
  }, 60_000)
})
