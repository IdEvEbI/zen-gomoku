/**
 * 五子棋胜负判断：给定棋盘与最后落子位置，判断是否五子连珠
 */

export type PieceColor = 'black' | 'white'

export function checkWinner(
  _board: PieceColor[][] | number[][],
  _lastRow: number,
  _lastCol: number
): PieceColor | null {
  // TODO: 沿横、竖、两斜共四向检测连续同色数量
  return null
}
