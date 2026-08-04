/**
 * AI 可插拔接口（架构 Phase 1～3 共用）
 */

export type AiPlayer = 1 | 2

export interface AiMove {
  row: number
  col: number
}

/**
 * 根据棋盘推断下一手玩家：黑先；子数相等走黑，黑比白多 1 则走白
 */
export function nextPlayerFromBoard(board: number[][]): AiPlayer {
  let black = 0
  let white = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === 1) black++
      else if (cell === 2) white++
    }
  }
  return black <= white ? 1 : 2
}

export function listEmptyCells(board: number[][]): AiMove[] {
  const empty: AiMove[] = []
  for (let row = 0; row < board.length; row++) {
    const line = board[row]
    if (!line) continue
    for (let col = 0; col < line.length; col++) {
      if (line[col] === 0) empty.push({ row, col })
    }
  }
  return empty
}

export interface IAgent {
  readonly name: string
  /** null 表示无子可下 */
  getNextMove(board: number[][]): Promise<AiMove | null>
}
