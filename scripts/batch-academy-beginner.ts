/**
 * Batch-import + solve academy/beginner puzzles (chujiti NNN).
 * Usage: npx tsx scripts/batch-academy-beginner.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseGameRecord, rebuildFromRecord, GAME_RECORD_VERSION } from '../src/core/gameRecord'
import { RULE_FREESTYLE } from '../src/core/rules'
import { findForkThreeMoves, findOpenFourMoves, findWinningMoves } from '../src/ai/threats'
import { findVctMove } from '../src/ai/vct'
import { planRootPhase } from '../src/ai/rootPolicy'
import { createAgentForDifficulty } from '../src/ai/index'
import { checkWinner } from '../src/core'
import { execSync } from 'node:child_process'

/** 入门题四四 1–20 → chujiti 31–50；入门题四三 1–20 → chujiti 51–70 */
const IDS = Array.from({ length: 40 }, (_, i) => 70 - i)

function titleFor(id: number): { title: string; skill: string } {
  if (id >= 51 && id <= 70) {
    return { title: `入门题四三 ${id - 50}`, skill: 'four-three' }
  }
  if (id >= 31 && id <= 50) {
    return { title: `入门题四四 ${id - 30}`, skill: 'double-four' }
  }
  throw new Error(`no title mapping for ${id}`)
}

const site = (r: number, c: number) => `${String.fromCharCode(97 + c)}${15 - r}`
const parseSite = (s: string) => ({
  c: s.charCodeAt(0) - 97,
  r: 15 - parseInt(s.slice(1), 10),
})

function isTrueDual(
  board: number[][],
  attacker: 1 | 2,
  ends: { row: number; col: number }[]
): boolean {
  if (ends.length < 2) return false
  const def = attacker === 1 ? 2 : 1
  for (const d of ends) {
    if (board[d.row]![d.col] !== 0) continue
    board[d.row]![d.col] = def
    const still =
      findWinningMoves(board, attacker).length > 0 || findOpenFourMoves(board, attacker).length > 0
    board[d.row]![d.col] = 0
    if (!still) return false
  }
  return true
}

function expandLine(
  board0: number[][],
  attacker: 1 | 2,
  first: string
): { sites: string; status: string } {
  const def = attacker === 1 ? 2 : 1
  const winStatus = attacker === 1 ? 'black_win' : 'white_win'
  const b = board0.map((r) => r.slice())
  const display: string[] = [first]
  const { r, c } = parseSite(first)
  b[r]![c] = attacker
  if (checkWinner(b, r, c) === attacker) return { sites: display.join(' '), status: winStatus }

  for (let i = 0; i < 16; i++) {
    const wins = findWinningMoves(b, attacker)
    const OF = findOpenFourMoves(b, attacker)
    if (wins.length >= 2) return { sites: display.join(' '), status: winStatus }
    if (wins.length === 1) {
      const d = wins[0]!
      b[d.row]![d.col] = def
      display.push(`(${site(d.row, d.col)})`)
      const w = findWinningMoves(b, attacker)[0]
      if (!w) return { sites: display.join(' '), status: 'stuck' }
      b[w.row]![w.col] = attacker
      display.push(site(w.row, w.col))
      if (checkWinner(b, w.row, w.col) === attacker)
        return { sites: display.join(' '), status: winStatus }
      continue
    }
    if (OF.length > 0) {
      const d = OF[0]!
      b[d.row]![d.col] = def
      display.push(`(${site(d.row, d.col)})`)
      const next =
        findWinningMoves(b, attacker)[0] ||
        findOpenFourMoves(b, attacker)[0] ||
        findVctMove(b, attacker, { maxPly: 12, maxNodes: 20_000 })
      if (!next) return { sites: display.join(' '), status: 'stuck' }
      b[next.row]![next.col] = attacker
      display.push(site(next.row, next.col))
      if (checkWinner(b, next.row, next.col) === attacker)
        return { sites: display.join(' '), status: winStatus }
      if (findWinningMoves(b, attacker).length >= 2)
        return { sites: display.join(' '), status: winStatus }
      continue
    }
    const mv = findVctMove(b, attacker, { maxPly: 12, maxNodes: 20_000 })
    if (!mv) return { sites: display.join(' '), status: 'no-vct' }
    b[mv.row]![mv.col] = attacker
    display.push(site(mv.row, mv.col))
    if (checkWinner(b, mv.row, mv.col) === attacker)
      return { sites: display.join(' '), status: winStatus }
  }
  return { sites: display.join(' '), status: 'incomplete' }
}

function buildMoves(
  setupMoves: { r: number; c: number; player: number }[],
  attacker: 1 | 2,
  line: string
) {
  const moves = setupMoves.map((m) => ({ ...m }))
  let p = attacker
  for (const tok of line.split(' ')) {
    const s = tok.replace(/[()]/g, '')
    const { r, c } = parseSite(s)
    moves.push({ r, c, player: p })
    p = p === 1 ? 2 : 1
  }
  return moves
}

type Row = {
  id: string
  title: string
  skill: string
  toPlay: string
  best: string
  trueDuals: string[]
  vct: string | null
  tang: string | null
  phase: string
  hit: boolean
  line: string
  lineStatus: string
  oppForks: number
}

async function processOne(id: number): Promise<Row> {
  const id3 = String(id).padStart(3, '0')
  const { title, skill } = titleFor(id)
  const url = `https://wuziqi123.com/qipu/chujiti/${id}.html`
  const out = `fixtures/records/academy/beginner/${id3}.json`
  execSync(`npm run import:wuziqi123 -- --url "${url}" --title "${title}" --out "${out}"`, {
    stdio: 'pipe',
  })

  const raw = JSON.parse(readFileSync(out, 'utf8'))
  const parsed = parseGameRecord(raw)
  if (!parsed.ok) throw new Error(parsed.message)
  const rebuilt = rebuildFromRecord(parsed.record)
  if ('error' in rebuilt) throw new Error(rebuilt.error)
  const { board, currentPlayer } = rebuilt
  const att = currentPlayer as 1 | 2
  const toPlay = att === 1 ? 'black' : 'white'

  const forks = findForkThreeMoves(board, att)
  const oppForks = findForkThreeMoves(board, att === 1 ? 2 : 1).length
  const trueDuals: string[] = []
  for (const f of forks) {
    board[f.row]![f.col] = att
    const OF = findOpenFourMoves(board, att)
    const ok = isTrueDual(board, att, OF)
    board[f.row]![f.col] = 0
    if (ok) trueDuals.push(site(f.row, f.col))
  }

  const t0 = Date.now()
  const vct = findVctMove(board, att, {
    maxPly: 16,
    maxNodes: 80_000,
    shouldAbort: () => Date.now() > t0 + 1200,
  })
  const phase = planRootPhase(
    board.map((r) => r.slice()),
    att,
    {
      vcfMaxPly: 14,
      vctMaxPly: 16,
      vctMaxNodes: 80_000,
      shouldAbortVct: () => Date.now() > t0 + 2000,
    }
  )
  const tang = await createAgentForDifficulty('tang').getNextMove(board.map((r) => r.slice()))

  const best =
    trueDuals[0] ?? (vct ? site(vct.row, vct.col) : tang ? site(tang.row, tang.col) : '?')
  const tangSite = tang ? site(tang.row, tang.col) : null
  const hit = Boolean(tangSite && (trueDuals.includes(tangSite) || tangSite === best))

  let chosen = best
  let line = expandLine(board, att, chosen)
  if (line.status !== 'white_win' && line.status !== 'black_win' && trueDuals.length > 1) {
    for (const s of trueDuals) {
      const L = expandLine(board, att, s)
      if (L.status === 'white_win' || L.status === 'black_win') {
        chosen = s
        line = L
        break
      }
    }
  }
  if (line.status !== 'white_win' && line.status !== 'black_win' && vct) {
    const s = site(vct.row, vct.col)
    const L = expandLine(board, att, s)
    if (L.status === 'white_win' || L.status === 'black_win') {
      chosen = s
      line = L
    }
  }

  writeFileSync(
    out,
    `${JSON.stringify(
      {
        ...raw,
        meta: {
          source: url,
          title,
          toPlay,
          skill,
          academy: 'wuzi-xuetang',
          note: `初级入门·${skill === 'four-three' ? '四三' : skill === 'double-four' ? '四四' : skill}。题面 ${parsed.record.moves.length} 手后轮${toPlay === 'white' ? '白' : '黑'}。`,
        },
      },
      null,
      2
    )}\n`
  )

  const solMoves = buildMoves(parsed.record.moves, att, line.sites)
  const done = line.status === 'white_win' || line.status === 'black_win'
  writeFileSync(
    `fixtures/records/academy/beginner/${id3}-solution.json`,
    `${JSON.stringify(
      {
        version: GAME_RECORD_VERSION,
        boardSize: 15,
        rules: RULE_FREESTYLE,
        status: done ? line.status : 'playing',
        moves: solMoves,
        meta: {
          source: url,
          title: `${title} · 学习谱`,
          setupMoves: parsed.record.moves.length,
          solutionSites: line.sites,
          complete: done,
          attacker: toPlay,
          engineFirst: chosen,
          trueDuals,
          tang: tangSite,
          tangHit: hit,
          skill,
          note: done
            ? `正解 ${chosen}${trueDuals.length ? `（真双: ${trueDuals.join(',')}）` : ''}。唐僧 ${tangSite ?? '—'}${hit ? ' 命中' : ' 未命中'}。`
            : `未能自动成五（${line.status}）；首着候选 ${chosen}。`,
        },
      },
      null,
      2
    )}\n`
  )

  return {
    id: id3,
    title,
    skill,
    toPlay,
    best: chosen,
    trueDuals,
    vct: vct ? site(vct.row, vct.col) : null,
    tang: tangSite,
    phase: phase.type === 'terminal' ? site(phase.move.row, phase.move.col) : phase.type,
    hit,
    line: line.sites,
    lineStatus: line.status,
    oppForks,
  }
}

const rows: Row[] = []
for (const id of IDS) {
  console.log('\n===', id, titleFor(id).title, '===')
  const row = await processOne(id)
  rows.push(row)
  console.log(JSON.stringify(row))
}

console.log('\n=== SUMMARY ===')
let hits = 0
for (const r of rows) {
  if (r.hit) hits++
  console.log(
    r.id,
    r.skill,
    r.hit ? 'HIT' : 'MISS',
    'best',
    r.best,
    'tang',
    r.tang,
    'vct',
    r.vct,
    'duals',
    r.trueDuals.join(',') || '-',
    'oppFk',
    r.oppForks,
    r.lineStatus,
    r.line
  )
}
console.log(`\nHIT ${hits}/${rows.length}`)
writeFileSync(
  'fixtures/records/academy/beginner/_batch-31-70.json',
  `${JSON.stringify(rows, null, 2)}\n`
)
