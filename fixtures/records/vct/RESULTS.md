# VCT 题集验证结果（#83）

> 生成自 `npm run verify:vct -- --write-results`。唐僧档案：ply=16 / 1200ms / nodes≤80000。

## 唐僧预算

| id                   | tier  | expect | status | move |  ms | ok  |
| -------------------- | ----- | ------ | ------ | ---- | --: | --- |
| synthetic-vcf-dual   | short | hit    | hit    | g8   |   4 | ✓   |
| synthetic-fork       | short | miss   | miss   | —    |  13 | ✓   |
| synthetic-open-three | short | hit    | hit    | k7   |   8 | ✓   |
| zhongjiti-127        | short | hit    | hit    | h10  |   2 | ✓   |
| zhongjiti-128        | short | hit    | hit    | f8   |   3 | ✓   |
| zhongjiti-129        | mid   | hit    | hit    | g13  |  45 | ✓   |
| gaojiti-221          | short | hit    | hit    | f10  |  20 | ✓   |
| gaojiti-222          | long  | hit    | hit    | h7   | 345 | ✓   |
| gaojiti-210          | short | hit    | hit    | g6   |  20 | ✓   |
| gaojiti-220          | short | hit    | hit    | i10  |  56 | ✓   |

## 结论

- **唐僧窗命中**：expect=hit 题在 ply16 / 1200ms / 80k nodes 下可解；221 首着应为 f10（冲四留叉）。
- **假杀**：`confirmRootVctAttack` 要求挡后硬续，拦 220 的 g6、221 的 l8/i5；裸双活三 synthetic-fork 为 expect miss。
- **参数折中**：总思考 1500ms；VCF 300ms + VCT 1200ms；嵌套 VCF 共用剩余节点。
- **下一步建议**：进 [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74) 学堂。
