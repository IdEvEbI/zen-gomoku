/**
 * 胜负判定：给定棋盘与最后落子位置，沿横、竖、两斜四向检测五子连珠
 * 无禁手规则，返回赢家 1 黑 2 白，否则 null
 */

const BOARD_SIZE = 15

const DIRECTIONS = [
  [0, 1],   // 水平
  [1, 0],   // 竖直
  [1, 1],   // 主对角线
  [1, -1],  // 副对角线
] as const

/**
 * 在 (row, col) 处沿 (dr, dc) 方向统计与 board[row][col] 同色的连续棋子数（含当前格）
 */
function countInDirection(
  board: number[][],
  row: number,
  col: number,
  dr: number,
  dc: number
): number {
  const player = board[row]?.[col]
  if (player !== 1 && player !== 2) return 0
  let count = 0
  let r = row
  let c = col
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]?.[c] === player) {
    count++
    r += dr
    c += dc
  }
  return count
}

/**
 * 给定棋盘与最后落子位置，若该子形成五连则返回赢家（1 黑 2 白），否则返回 null
 */
export function checkWinner(
  board: number[][],
  lastRow: number,
  lastCol: number
): 1 | 2 | null {
  const player = board[lastRow]?.[lastCol]
  if (player !== 1 && player !== 2) return null

  for (const [dr, dc] of DIRECTIONS) {
    const forward = countInDirection(board, lastRow, lastCol, dr, dc)
    const backward = countInDirection(board, lastRow, lastCol, -dr, -dc)
    // 当前格被正反各算了一次，所以总数为 forward + backward - 1
    if (forward + backward - 1 >= 5) {
      return player as 1 | 2
    }
  }
  return null
}
