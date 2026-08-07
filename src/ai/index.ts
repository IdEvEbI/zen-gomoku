export type { IAgent, AiMove, AiPlayer } from './types'
export { nextPlayerFromBoard, listEmptyCells } from './types'
export { buildWinsTable, buildWinsCounts } from './winsTable'
export {
  evaluateBoard,
  scoreEmptyCell,
  listOrderedCandidates,
  listNeighborCandidates,
  WIN_SCORE,
  CRITICAL_THREAT_SCORE,
  URGENT_THREAT_SCORE,
  OPPONENT_SCORE,
  SELF_SCORE,
} from './evaluate'
export {
  findWinningMoves,
  findFourThreatMoves,
  findOpenFourMoves,
  findOpenThreeMoves,
  findForkThreeMoves,
  listHardForcedReplies,
  listSoftDefenseCandidates,
  listSoftRootCandidates,
  listForcedReplies,
  pickBestForcedReply,
  scoreForcedReply,
  measureAttackLethality,
  listThreatCandidates,
  findForcedWinMove,
} from './threats'
export {
  findVcfMove,
  hasVcf,
  vcfExists,
  findVcfDefense,
  DEFAULT_VCF_MAX_PLY,
  type VcfOptions,
} from './vcf'
export {
  findVctMove,
  hasVct,
  vctExists,
  findVctDefense,
  DEFAULT_VCT_MAX_PLY,
  type VctOptions,
} from './vct'
export { RandomAgent } from './RandomAgent'
export { HeuristicAgent } from './HeuristicAgent'
export { ShaHeshangAgent } from './ShaHeshangAgent'
export { MinimaxAgent } from './MinimaxAgent'
export {
  planRootPhase,
  resolveSearchWithDefenseFloor,
  buildSoftRootRestrict,
  listAttackCandidates,
  pickForkRaceMove,
  type RootPhase,
  type RootPolicyOptions,
} from './rootPolicy'
export {
  createAgentForDifficulty,
  difficultyLabel,
  AI_DIFFICULTY_OPTIONS,
  DEFAULT_AI_DIFFICULTY,
  type AiDifficulty,
  type AiDifficultyOption,
} from './difficulty'
export {
  OpeningBookController,
  expandOpeningSeeds,
  DEFAULT_OPENING_SEEDS,
  SEED_TENGEN,
  SEED_HUAYUE,
  SEED_PUYUE,
  getOpeningSeedById,
  type OpeningSeed,
  type BookMove,
} from './openingBook'
