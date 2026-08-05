/**
 * CLI：批量导出老师棋谱（唐僧 vs 唐僧，默认可改难度）
 *
 * 用法示例：
 *   npm run generate:teacher-records -- --rules freestyle-v1 --count 10
 *   npm run generate:teacher-records -- --rules renju-cn-v1 --count 10 --out data/teacher
 *   npm run generate:teacher-records -- --rules both --count 5 --difficulty zhu
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { RULE_FREESTYLE, RULE_RENJU_CN, isRuleSetId, type RuleSetId } from '../src/core'
import { generateTeacherRecords, recordsToJsonl } from '../src/training'
import type { AiDifficulty } from '../src/ai'
import type { GenerateProgress, OpeningMode } from '../src/training'

function printHelp(): void {
  console.log(`Usage: npm run generate:teacher-records -- [options]

Options:
  --rules <id|both>     freestyle-v1 | renju-cn-v1 | both (default: both)
  --count <n>           games per rules set (default: 10)
  --difficulty <id>     sha|zhu|wukong|tang (default: tang)
  --opening <mode>      random|seed|mixed (default: mixed)
  --extra <n>           random extra moves after tengen when not pure seed (default: 2)
  --out <dir>           output directory (default: data/teacher)
  --help                show help
`)
}

function parseArgs(argv: string[]) {
  const opts = {
    rules: 'both' as string,
    count: 10,
    difficulty: 'tang' as AiDifficulty,
    opening: 'mixed' as OpeningMode,
    extra: 2,
    out: 'data/teacher',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = argv[i + 1]
    if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    }
    if (a === '--rules' && next) {
      opts.rules = next
      i++
    } else if (a === '--count' && next) {
      opts.count = Math.max(1, Number(next) || 10)
      i++
    } else if (a === '--difficulty' && next) {
      opts.difficulty = next as AiDifficulty
      i++
    } else if (a === '--opening' && next) {
      opts.opening = next as OpeningMode
      i++
    } else if (a === '--extra' && next) {
      opts.extra = Math.max(0, Number(next) || 0)
      i++
    } else if (a === '--out' && next) {
      opts.out = next
      i++
    }
  }
  return opts
}

function resolveRulesList(spec: string): RuleSetId[] {
  if (spec === 'both') return [RULE_FREESTYLE, RULE_RENJU_CN]
  if (isRuleSetId(spec)) return [spec]
  throw new Error(`未知 rules: ${spec}`)
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '?'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  if (min < 60) return `${min}m${String(rem).padStart(2, '0')}s`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  return `${hr}h${String(remMin).padStart(2, '0')}m`
}

function printProgress(rules: RuleSetId, info: GenerateProgress): void {
  const { index, total, record, gameMs, elapsedMs } = info
  const pct = ((index / total) * 100).toFixed(1)
  const avg = elapsedMs / index
  const eta = avg * (total - index)
  const line =
    `[${rules}] ${index}/${total} (${pct}%) | ` +
    `last ${formatDuration(gameMs)} | elapsed ${formatDuration(elapsedMs)} | ` +
    `ETA ${formatDuration(eta)} | ${record.status} ${record.moves.length}moves`
  // 单行刷新，避免 1000 局刷屏；每局结束都会更新，不会「卡住」
  process.stdout.write(`\r${line.padEnd(100)}`)
  if (index === total) {
    process.stdout.write('\n')
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))
  const rulesList = resolveRulesList(opts.rules)
  await mkdir(opts.out, { recursive: true })

  for (const rules of rulesList) {
    console.log(
      `Generating ${opts.count} games: rules=${rules} difficulty=${opts.difficulty} opening=${opts.opening}…`
    )
    const started = Date.now()
    const records = await generateTeacherRecords({
      rules,
      count: opts.count,
      difficulty: opts.difficulty,
      openingMode: opts.opening,
      randomExtraMoves: opts.extra,
      onProgress: (info) => printProgress(rules, info),
    })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(opts.out, `${rules}-${stamp}.jsonl`)
    await writeFile(file, recordsToJsonl(records), 'utf8')
    const wins = {
      black: records.filter((r) => r.status === 'black_win').length,
      white: records.filter((r) => r.status === 'white_win').length,
      draw: records.filter((r) => r.status === 'draw').length,
    }
    console.log(
      `Wrote ${records.length} records → ${file} (${formatDuration(Date.now() - started)})`,
      wins
    )
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
