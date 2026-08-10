# VCT 题集验证结果（#83）

> 生成自 `npm run verify:vct -- --write-results`。唐僧档案：ply=16 / 1200ms / nodes≤80000。

## 唐僧预算

| id                   | tier  | expect | status  | move |   ms | ok  |
| -------------------- | ----- | ------ | ------- | ---- | ---: | --- |
| synthetic-vcf-dual   | short | hit    | hit     | g8   |    3 | ✓   |
| synthetic-fork       | short | hit    | hit     | h10  |  149 | ✓   |
| synthetic-open-three | short | hit    | hit     | k7   |  863 | ✓   |
| zhongjiti-127        | short | hit    | hit     | h10  |    1 | ✓   |
| zhongjiti-128        | short | hit    | hit     | f8   |    3 | ✓   |
| zhongjiti-129        | mid   | hit    | hit     | g13  |   43 | ✓   |
| gaojiti-221          | mid   | miss   | timeout | —    | 2685 | ✓   |
| gaojiti-222          | long  | hit    | hit     | h7   |  696 | ✓   |
| gaojiti-210          | mid   | miss   | timeout | —    | 5907 | ✓   |
| gaojiti-220          | long  | miss   | timeout | —    | 5202 | ✓   |

## 结论

- **加深后命中**：open-three、zhongjiti-129、gaojiti-222 等在 ply16 / 1200ms / 80k nodes 下可解。
- **仍超时**：gaojiti-221（约 3s）与 210/220（未证）保持 expect miss。
- **参数折中**：总思考 1500ms；VCF 300ms + VCT 1200ms；嵌套 VCF 共用剩余节点。
- **下一步建议**：进 [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74) 学堂（先收录 expectTangHit=true）。
