/**
 * 规则集 ID（与 alphazero-lite / 棋谱 metadata 对齐）
 */

export const RULE_FREESTYLE = 'freestyle-v1' as const
export const RULE_RENJU_CN = 'renju-cn-v1' as const

export type RuleSetId = typeof RULE_FREESTYLE | typeof RULE_RENJU_CN

export const DEFAULT_RULE_SET: RuleSetId = RULE_FREESTYLE

export const RULE_SET_OPTIONS: readonly {
  id: RuleSetId
  name: string
}[] = [
  { id: RULE_FREESTYLE, name: '自由' },
  { id: RULE_RENJU_CN, name: '禁手' },
] as const

export function isRuleSetId(v: unknown): v is RuleSetId {
  return v === RULE_FREESTYLE || v === RULE_RENJU_CN
}

export function ruleSetLabel(id: RuleSetId): string {
  return RULE_SET_OPTIONS.find((o) => o.id === id)?.name ?? id
}
