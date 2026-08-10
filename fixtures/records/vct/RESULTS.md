# VCT 题集验证结果（#83）

> 生成自 `npm run verify:vct -- --write-results`。唐僧档案：ply=16 / 1200ms / nodes≤80000。

## 唐僧预算

| id                   | tier  | expect | status | move |  ms | ok  |
| -------------------- | ----- | ------ | ------ | ---- | --: | --- |
| synthetic-vcf-dual   | short | hit    | hit    | g8   |   3 | ✓   |
| synthetic-fork       | short | hit    | hit    | h10  |   6 | ✓   |
| synthetic-open-three | short | hit    | hit    | k7   |   9 | ✓   |
| zhongjiti-127        | short | hit    | hit    | h10  |   1 | ✓   |
| zhongjiti-128        | short | hit    | hit    | f8   |   3 | ✓   |
| zhongjiti-129        | mid   | hit    | hit    | g13  |  47 | ✓   |
| gaojiti-221          | short | hit    | hit    | l8   |  10 | ✓   |
| gaojiti-222          | long  | hit    | hit    | h7   | 323 | ✓   |
| gaojiti-210          | short | hit    | hit    | i11  |  11 | ✓   |
| gaojiti-220          | short | hit    | hit    | g9   |  28 | ✓   |

## 结论

- **唐僧窗命中**：本题集 expect=hit 题均在 ply16 / 1200ms / 80k nodes 下可解（含 210/220/221/222）。
- **假杀**：根上 `confirmRootVctAttack` 拦截单冲四假续（220 的 g6）。
- **参数折中**：总思考 1500ms；VCF 300ms + VCT 1200ms；嵌套 VCF 共用剩余节点。
- **下一步建议**：进 [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74) 学堂。
