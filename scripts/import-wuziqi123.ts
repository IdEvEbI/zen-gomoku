/**
 * 从 wuziqi123.com 习题页 / iframe moves 串导出本仓可导入棋谱 JSON。
 *
 * 用法：
 *   npm run import:wuziqi123 -- --url https://wuziqi123.com/qipu/zhongjiti/129.html
 *   npm run import:wuziqi123 -- --moves h8h9j10... --out fixtures/records/wuziqi123/xxx.json
 *   npm run import:wuziqi123 -- --url ... --annotate   # 额外写出带 site 坐标的对照版
 *
 * 坐标：站点 a–o / 1(底)–15(顶) → 本仓 c=0..14, r=15-n（与 qipan3/view.html 一致）
 * 说明：docs/development/puzzle-import.md
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { GAME_RECORD_VERSION, type GameRecord, type RecordMove } from '../src/core/gameRecord'
import { RULE_FREESTYLE } from '../src/core/rules'

function printHelp(): void {
  console.log(`Usage: npm run import:wuziqi123 -- [options]

Options:
  --url <url>       习题页 URL（解析 iframe ?moves=）
  --moves <str>     直接传入站点 moves 串（与 --url 二选一，可并存：--moves 优先）
  --out <path>      输出 JSON（默认 fixtures/records/wuziqi123-<stamp>.json）
  --annotate        同时写出 *.annotated.json（含 site 坐标与来源）
  --title <text>    写入 annotated.meta.title
  --help            显示帮助

精选题归档见 fixtures/records/；合规边界见 docs/design/content-sources.md。
`)
}

function parseArgs(argv: string[]) {
  const opts = {
    url: '' as string,
    moves: '' as string,
    out: '' as string,
    annotate: false,
    title: '' as string,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') opts.help = true
    else if (a === '--annotate') opts.annotate = true
    else if (a === '--url') opts.url = argv[++i] ?? ''
    else if (a === '--moves') opts.moves = argv[++i] ?? ''
    else if (a === '--out') opts.out = argv[++i] ?? ''
    else if (a === '--title') opts.title = argv[++i] ?? ''
  }
  return opts
}

/** 与 wuziqi123 qipan3 unpack() 一致 */
export function unpackSiteMoves(moves: string): string[] {
  const MS: string[] = []
  let m = moves.trim()
  while (m.length) {
    let a = m.slice(0, 2)
    m = m.slice(2)
    if (a === '--') {
      MS.push('pass')
      continue
    }
    const d = m.length ? m.charCodeAt(0) - '0'.charCodeAt(0) : -1
    if (d >= 0 && d <= 9) {
      a += m.slice(0, 1)
      m = m.slice(1)
    }
    MS.push(a.toLowerCase())
  }
  return MS
}

export function siteCoordToRecord(coord: string): { r: number; c: number } {
  if (!/^[a-o]([1-9]|1[0-5])$/i.test(coord)) {
    throw new Error(`非法站点坐标: ${coord}`)
  }
  const c = coord.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0)
  const n = parseInt(coord.slice(1), 10)
  return { r: 15 - n, c }
}

export function recordToSiteCoord(r: number, c: number): string {
  return `${String.fromCharCode(97 + c)}${15 - r}`
}

function extractMovesFromHtml(html: string): string | null {
  const iframe = html.match(/iframe[^>]+src=["']([^"']+)["']/i)
  if (iframe?.[1]) {
    const src = iframe[1]
    const q = src.includes('moves=') ? src : null
    if (q) {
      const u = new URL(q, 'https://wuziqi123.com')
      const moves = u.searchParams.get('moves')
      if (moves) return moves
    }
  }
  const m = html.match(/[?&]moves=([a-o0-9-]+)/i)
  return m?.[1] ?? null
}

async function fetchMovesFromUrl(url: string): Promise<{ moves: string; finalUrl: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'zen-gomoku-import/0.1 (+local-dev)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  const html = await res.text()
  const moves = extractMovesFromHtml(html)
  if (!moves) throw new Error(`页面未找到 iframe moves: ${url}`)
  return { moves, finalUrl: res.url }
}

function toGameRecord(siteMoves: string[]): GameRecord {
  const moves: RecordMove[] = []
  const occupied = new Set<string>()
  for (let i = 0; i < siteMoves.length; i++) {
    const site = siteMoves[i]!
    if (site === 'pass') continue
    const { r, c } = siteCoordToRecord(site)
    const key = `${r},${c}`
    if (occupied.has(key)) throw new Error(`着法重叠: ${site} (step ${i + 1})`)
    occupied.add(key)
    moves.push({ r, c, player: i % 2 === 0 ? 1 : 2 })
  }
  return {
    version: GAME_RECORD_VERSION,
    boardSize: 15,
    rules: RULE_FREESTYLE,
    status: 'playing',
    moves,
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }
  if (!opts.url && !opts.moves) {
    printHelp()
    process.exitCode = 1
    return
  }

  let siteMovesStr = opts.moves
  let sourceUrl = opts.url
  if (!siteMovesStr && opts.url) {
    const got = await fetchMovesFromUrl(opts.url)
    siteMovesStr = got.moves
    sourceUrl = got.finalUrl
    console.log(`fetched moves (${siteMovesStr.length} chars) from ${sourceUrl}`)
  }

  const siteList = unpackSiteMoves(siteMovesStr)
  const record = toGameRecord(siteList)
  const black = record.moves.filter((m) => m.player === 1).length
  const white = record.moves.filter((m) => m.player === 2).length

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outPath = opts.out || path.join('fixtures', 'records', `wuziqi123-${stamp}.json`)
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  console.log(`wrote ${outPath}`)
  console.log(
    `steps=${record.moves.length} black=${black} white=${white} next=${black === white ? 'black' : 'white'}`
  )

  if (opts.annotate) {
    const annotated = {
      ...record,
      meta: {
        source: sourceUrl || null,
        title: opts.title || null,
        siteMoves: siteMovesStr,
        note: '站点坐标 a-o / 1底-15顶；本仓 r=15-n,c=a..o。',
      },
      moves: record.moves.map((m, i) => ({
        ...m,
        site: siteList[i] === 'pass' ? 'pass' : recordToSiteCoord(m.r, m.c),
      })),
    }
    const annPath = outPath.replace(/\.json$/i, '.annotated.json')
    await writeFile(annPath, `${JSON.stringify(annotated, null, 2)}\n`, 'utf8')
    console.log(`wrote ${annPath}`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
