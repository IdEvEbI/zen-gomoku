export { checkWinner } from './checkWinner'
export {
  toGameRecord,
  parseGameRecord,
  rebuildFromRecord,
  stringifyGameRecord,
  boardFromHistory,
  GAME_RECORD_VERSION,
  DEFAULT_BOARD_SIZE,
} from './gameRecord'
export type {
  GameRecord,
  RecordMove,
  RecordPlayer,
  RecordStatus,
  RebuiltGameState,
  ParseRecordResult,
} from './gameRecord'
