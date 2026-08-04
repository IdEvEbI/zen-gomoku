/**
 * 赢法表：wins[row][col][k] 表示 (row,col) 是否属于第 k 种五连赢法
 * 源自经典「赢法数组」人机方案（与旧 gobang DEMO 同构）
 */

export function buildWinsTable(boardSize: number): {
  wins: boolean[][][]
  winsCount: number
} {
  const wins: boolean[][][] = []
  for (let row = 0; row < boardSize; row++) {
    wins[row] = []
    for (let col = 0; col < boardSize; col++) {
      wins[row]![col] = []
    }
  }

  let num = 0

  // 横向
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize - 4; col++) {
      for (let k = 0; k < 5; k++) {
        wins[row]![col + k]![num] = true
      }
      num++
    }
  }

  // 纵向
  for (let col = 0; col < boardSize; col++) {
    for (let row = 0; row < boardSize - 4; row++) {
      for (let k = 0; k < 5; k++) {
        wins[row + k]![col]![num] = true
      }
      num++
    }
  }

  // 主对角 ↘
  for (let row = 0; row < boardSize - 4; row++) {
    for (let col = 0; col < boardSize - 4; col++) {
      for (let k = 0; k < 5; k++) {
        wins[row + k]![col + k]![num] = true
      }
      num++
    }
  }

  // 副对角 ↙
  for (let row = 0; row < boardSize - 4; row++) {
    for (let col = boardSize - 1; col >= 4; col--) {
      for (let k = 0; k < 5; k++) {
        wins[row + k]![col - k]![num] = true
      }
      num++
    }
  }

  return { wins, winsCount: num }
}

/**
 * 根据当前棋盘重建各方在每种赢法上的计数
 * count[k]：已落子数；-1 表示该赢法已被对手破坏
 */
export function buildWinsCounts(
  board: number[][],
  wins: boolean[][][],
  winsCount: number,
  player: 1 | 2
): number[] {
  const counts = new Array(winsCount).fill(0)
  const size = board.length
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = board[row]?.[col]
      if (cell !== 1 && cell !== 2) continue
      for (let k = 0; k < winsCount; k++) {
        if (!wins[row]?.[col]?.[k]) continue
        if (cell === player) {
          if (counts[k] !== -1) counts[k]++
        } else {
          counts[k] = -1
        }
      }
    }
  }
  return counts
}
