/**
 * 用已知站点坐标主线拼出可导入学习谱（不依赖当场深搜）。
 * 主线来自本仓引擎先前展开；未成五的标 complete=false。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  GAME_RECORD_VERSION,
  parseGameRecord,
  rebuildFromRecord,
  type RecordMove,
} from '../src/core/gameRecord'
import { checkWinner } from '../src/core'
import { RULE_FREESTYLE } from '../src/core/rules'
import { siteCoordToRecord } from './import-wuziqi123'

const PUZZLES: Record<
  string,
  { title: string; source: string; /** 攻守交错，守方也会写入 */ line: string[] }
> = {
  '210': {
    title: 'SIRIUS初级VCT习题CH17',
    source: 'https://wuziqi123.com/qipu/gaojiti/210.html',
    // 引擎曾展开的强迫前缀（未成五）
    line: ['f5', 'g6', 'i11', 'g11', 'l11', 'k11', 'k9', 'l8'],
  },
  '220': {
    title: 'SIRIUS高级VCT习题CH8',
    source: 'https://wuziqi123.com/qipu/gaojiti/220.html',
    // 人对唐僧正解（2026-08-10-03-42-36）+ 谱尾 k2
    line: [
      'i10',
      'l10',
      'k8',
      'l7',
      'j6',
      'k5',
      'g6',
      'h7',
      'i6',
      'h6',
      'h5',
      'j7',
      'i4',
      'i5',
      'j3',
      'f7',
      'k2',
    ],
  },
  '221': {
    title: 'SIRIUS中级VCT习题CH8',
    source: 'https://wuziqi123.com/qipu/gaojiti/221.html',
    // 深搜首着 f10；续着为强迫前缀
    line: ['f10', 'g9', 'l8', 'm9', 'i5', 'h4', 'i6', 'i4', 'h6', 'g6', 'l6', 'k6', 'l7', 'l9'],
  },
  '222': {
    title: 'SIRIUS高级VCT习题CH7',
    source: 'https://wuziqi123.com/qipu/gaojiti/222.html',
    line: [
      'h7',
      'i7',
      'h6',
      'h9',
      'h4',
      'h5',
      'f8',
      'e9',
      'j4',
      'i5',
      'i4',
      'k4',
      'f4',
      'g4',
      'j6',
      'j5',
      'i6',
      'k6',
    ],
  },
}

function build(id: string) {
  const spec = PUZZLES[id]!
  const raw = JSON.parse(
    readFileSync(`fixtures/records/wuziqi123/gaojiti-${id}.json`, 'utf8')
  ) as unknown
  const parsed = parseGameRecord(raw)
  if (!parsed.ok) throw new Error(parsed.message)
  const rebuilt = rebuildFromRecord(parsed.record)
  if ('error' in rebuilt) throw new Error(rebuilt.error)

  const board = rebuilt.board.map((r) => r.slice())
  const moves: RecordMove[] = parsed.record.moves.map((m) => ({ ...m }))
  let toPlay = rebuilt.currentPlayer as 1 | 2
  const attacker = toPlay
  const display: string[] = []
  let status: 'playing' | 'black_win' | 'white_win' = 'playing'

  for (const site of spec.line) {
    const { r, c } = siteCoordToRecord(site)
    if (board[r]![c] !== 0) {
      throw new Error(`${id}: occupied ${site}`)
    }
    board[r]![c] = toPlay
    moves.push({ r, c, player: toPlay })
    display.push(toPlay === attacker ? site : `(${site})`)
    const w = checkWinner(board, r, c, RULE_FREESTYLE)
    if (w === 1 || w === 2) {
      status = w === 1 ? 'black_win' : 'white_win'
      break
    }
    toPlay = toPlay === 1 ? 2 : 1
  }

  // 校验落子合法性：行棋方交替
  let expect = rebuilt.currentPlayer
  for (let i = parsed.record.moves.length; i < moves.length; i++) {
    if (moves[i]!.player !== expect) {
      throw new Error(`${id}: player order broken at ${i}`)
    }
    expect = expect === 1 ? 2 : 1
  }

  const record = {
    version: GAME_RECORD_VERSION,
    boardSize: 15,
    rules: RULE_FREESTYLE,
    status,
    moves,
    meta: {
      source: spec.source,
      title: `${spec.title} · 学习谱`,
      setupMoves: parsed.record.moves.length,
      solutionSites: display.join(' ') || null,
      complete: status !== 'playing',
      attacker: attacker === 1 ? 'black' : 'white',
      note:
        display.length === 0
          ? '暂无可靠引擎成五主线；仅题面。请对照站点拆解（勿信任未验证续着）。'
          : status === 'playing'
            ? '引擎强迫主线前缀（尚未成五）。H5 导入后可从谱尾继续拆；括号内为守方挡点。非站点官方唯一解。'
            : '引擎主线已成五。括号内为守方挡点。非站点官方唯一解。',
    },
  }

  const out = `fixtures/records/wuziqi123/gaojiti-${id}-solution.json`
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`)
  console.log(
    id,
    status,
    'nextWouldBe',
    expect === 1 ? 'black' : 'white',
    '|',
    display.join(' ') || '(setup only)',
    '->',
    out
  )
}

for (const id of Object.keys(PUZZLES)) build(id)
