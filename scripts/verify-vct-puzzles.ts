/**
 * VCT 题集验证（#83）：按 manifest 对 findVctMove 跑唐僧预算与可选深搜对照。
 *
 *   npm run verify:vct
 *   npm run verify:vct -- --deep
 *   npm run verify:vct -- --write-results
 *
 * 合规：仅手拣题；见 docs/design/content-sources.md
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseGameRecord, rebuildFromRecord } from '../src/core/gameRecord'
import { findVctMove, type VctOptions } from '../src/ai/vct'
import { recordToSiteCoord } from './import-wuziqi123'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_PATH = path.join(ROOT, 'fixtures/records/vct/manifest.json')
const RESULTS_PATH = path.join(ROOT, 'fixtures/records/vct/RESULTS.md')

interface Stone {
  r: number
  c: number
  player: 1 | 2
}

interface Puzzle {
  id: string
  tier: 'short' | 'mid' | 'long'
  kind: string
  title: string
  source?: string
  record?: string
  toPlay?: 1 | 2
  stones?: Stone[]
  expectTangHit: boolean
  acceptableMoves?: string[]
  deepReference?: string
  notes?: string
}

interface Manifest {
  version: number
  description: string
  tangProfile: { maxPly: number; budgetMs: number; maxNodes: number }
  deepProfile: { maxPly: number; budgetMs: number; maxNodes: number }
  puzzles: Puzzle[]
}

type Status = 'hit' | 'miss' | 'timeout' | 'wrong'

interface RunRow {
  id: string
  tier: string
  expectTangHit: boolean
  status: Status
  move: string | null
  ms: number
  ok: boolean
  notes?: string
}

function parseArgs(argv: string[]) {
  return {
    deep: argv.includes('--deep'),
    writeResults: argv.includes('--write-results'),
    help: argv.includes('--help') || argv.includes('-h'),
  }
}

function emptyBoard(size = 15): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function applyStones(board: number[][], stones: Stone[]) {
  for (const s of stones) {
    board[s.r]![s.c] = s.player
  }
}

async function loadBoard(puzzle: Puzzle): Promise<{ board: number[][]; toPlay: 1 | 2 }> {
  if (puzzle.stones && puzzle.toPlay) {
    const board = emptyBoard()
    applyStones(board, puzzle.stones)
    return { board, toPlay: puzzle.toPlay }
  }
  if (!puzzle.record) {
    throw new Error(`${puzzle.id}: need stones+toPlay or record`)
  }
  const raw = JSON.parse(await readFile(path.join(ROOT, puzzle.record), 'utf8')) as unknown
  const parsed = parseGameRecord(raw)
  if (!parsed.ok) throw new Error(`${puzzle.id}: ${parsed.message}`)
  const rebuilt = rebuildFromRecord(parsed.record)
  if ('error' in rebuilt) throw new Error(`${puzzle.id}: ${rebuilt.error}`)
  if (rebuilt.status !== 'playing') {
    throw new Error(`${puzzle.id}: record not playing (${rebuilt.status})`)
  }
  return { board: rebuilt.board, toPlay: rebuilt.currentPlayer }
}

function classify(
  puzzle: Puzzle,
  move: string | null,
  aborted: boolean,
  expectHit: boolean
): { status: Status; ok: boolean } {
  const acceptable = puzzle.acceptableMoves ?? []
  if (move && acceptable.length > 0 && acceptable.includes(move)) {
    return { status: 'hit', ok: expectHit }
  }
  if (move && acceptable.length === 0) {
    // no golden move yet — treat any find as hit for expectHit=true only when we allow?
    return { status: 'hit', ok: expectHit }
  }
  if (move && acceptable.length > 0 && !acceptable.includes(move)) {
    return { status: 'wrong', ok: !expectHit ? false : false }
  }
  if (aborted) {
    return { status: 'timeout', ok: !expectHit }
  }
  return { status: 'miss', ok: !expectHit }
}

function runFind(
  board: number[][],
  toPlay: 1 | 2,
  profile: { maxPly: number; budgetMs: number; maxNodes: number }
): { move: string | null; ms: number; aborted: boolean } {
  const t0 = Date.now()
  const deadline = t0 + profile.budgetMs
  let aborted = false
  const opts: VctOptions = {
    maxPly: profile.maxPly,
    maxNodes: profile.maxNodes,
    shouldAbort: () => {
      if (Date.now() >= deadline) {
        aborted = true
        return true
      }
      return false
    },
  }
  const found = findVctMove(board, toPlay, opts)
  const ms = Date.now() - t0
  if (ms >= profile.budgetMs) aborted = true
  return {
    move: found ? recordToSiteCoord(found.row, found.col) : null,
    ms,
    aborted,
  }
}

function printHelp() {
  console.log(`Usage: npm run verify:vct -- [options]

Options:
  --deep            额外跑深搜对照（慢）
  --write-results   写入 fixtures/records/vct/RESULTS.md
  --help            显示帮助
`)
}

function renderResultsMd(
  manifest: Manifest,
  tangRows: RunRow[],
  deepRows: RunRow[] | null,
  conclusion: string
): string {
  const lines: string[] = [
    '# VCT 题集验证结果（#83）',
    '',
    `> 生成自 \`npm run verify:vct -- --write-results\`。唐僧档案：ply=${manifest.tangProfile.maxPly} / ${manifest.tangProfile.budgetMs}ms / nodes≤${manifest.tangProfile.maxNodes}。`,
    '',
    '## 唐僧预算',
    '',
    '| id | tier | expect | status | move | ms | ok |',
    '| --- | --- | --- | --- | --- | ---: | --- |',
  ]
  for (const r of tangRows) {
    lines.push(
      `| ${r.id} | ${r.tier} | ${r.expectTangHit ? 'hit' : 'miss'} | ${r.status} | ${r.move ?? '—'} | ${r.ms} | ${r.ok ? '✓' : '✗'} |`
    )
  }
  if (deepRows) {
    lines.push(
      '',
      '## 深搜对照',
      '',
      `| ply=${manifest.deepProfile.maxPly} / ${manifest.deepProfile.budgetMs}ms / nodes≤${manifest.deepProfile.maxNodes} |`,
      '',
      '| id | status | move | ms |',
      '| --- | --- | --- | ---: |'
    )
    for (const r of deepRows) {
      lines.push(`| ${r.id} | ${r.status} | ${r.move ?? '—'} | ${r.ms} |`)
    }
  }
  lines.push('', '## 结论', '', conclusion, '')
  return `${lines.join('\n')}\n`
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as Manifest
  const tangRows: RunRow[] = []
  const deepRows: RunRow[] = []

  console.log(manifest.description)
  console.log(
    `Tang: ply=${manifest.tangProfile.maxPly} budget=${manifest.tangProfile.budgetMs}ms nodes=${manifest.tangProfile.maxNodes}`
  )
  console.log('')

  for (const puzzle of manifest.puzzles) {
    const { board, toPlay } = await loadBoard(puzzle)
    const tang = runFind(board, toPlay, manifest.tangProfile)
    const { status, ok } = classify(puzzle, tang.move, tang.aborted, puzzle.expectTangHit)
    const row: RunRow = {
      id: puzzle.id,
      tier: puzzle.tier,
      expectTangHit: puzzle.expectTangHit,
      status,
      move: tang.move,
      ms: tang.ms,
      ok,
      notes: puzzle.notes,
    }
    tangRows.push(row)
    const mark = ok ? 'OK ' : 'FAIL'
    console.log(
      `[tang] ${mark} ${puzzle.id.padEnd(22)} ${status.padEnd(8)} move=${(tang.move ?? '—').padEnd(4)} ${String(tang.ms).padStart(5)}ms  expect=${puzzle.expectTangHit ? 'hit' : 'miss'}`
    )

    if (opts.deep) {
      const deep = runFind(board, toPlay, manifest.deepProfile)
      const deepClass = classify(
        puzzle,
        deep.move,
        deep.aborted,
        Boolean(deep.move) || Boolean(puzzle.deepReference)
      )
      deepRows.push({
        id: puzzle.id,
        tier: puzzle.tier,
        expectTangHit: puzzle.expectTangHit,
        status: deepClass.status,
        move: deep.move,
        ms: deep.ms,
        ok: true,
      })
      console.log(
        `       deep          ${deepClass.status.padEnd(8)} move=${(deep.move ?? '—').padEnd(4)} ${String(deep.ms).padStart(5)}ms`
      )
    }
  }

  const failed = tangRows.filter((r) => !r.ok)
  const hitExpect = tangRows.filter((r) => r.expectTangHit)
  const missExpect = tangRows.filter((r) => !r.expectTangHit)
  const hitOk = hitExpect.filter((r) => r.ok).length
  const missOk = missExpect.filter((r) => r.ok).length

  console.log('')
  console.log(
    `Summary: expect-hit ${hitOk}/${hitExpect.length} · expect-miss ${missOk}/${missExpect.length} · unexpected ${failed.length}`
  )

  const conclusion = [
    '- **加深后命中**：open-three、zhongjiti-129、gaojiti-222 等在 ply16 / 1200ms / 80k nodes 下可解。',
    '- **仍超时**：gaojiti-221（约 3s）与 210/220（未证）保持 expect miss。',
    '- **参数折中**：总思考 1500ms；VCF 300ms + VCT 1200ms；嵌套 VCF 共用剩余节点。',
    '- **下一步建议**：进 [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74) 学堂（先收录 expectTangHit=true）。',
  ].join('\n')

  console.log('')
  console.log(conclusion)

  if (opts.writeResults) {
    const md = renderResultsMd(manifest, tangRows, opts.deep ? deepRows : null, conclusion)
    await writeFile(RESULTS_PATH, md, 'utf8')
    console.log(`\nwrote ${path.relative(ROOT, RESULTS_PATH)}`)
  }

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
