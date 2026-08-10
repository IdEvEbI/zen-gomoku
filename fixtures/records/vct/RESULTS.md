# VCT 题集验证结果（#83）

> 生成自 `npm run verify:vct -- --write-results`。唐僧档案：ply=12 / 400ms / nodes≤8000。

## 唐僧预算

| id                   | tier  | expect | status  | move |    ms | ok  |
| -------------------- | ----- | ------ | ------- | ---- | ----: | --- |
| synthetic-vcf-dual   | short | hit    | hit     | g8   |     3 | ✓   |
| synthetic-fork       | short | hit    | hit     | h10  |   157 | ✓   |
| synthetic-open-three | short | miss   | timeout | —    |   898 | ✓   |
| zhongjiti-127        | short | hit    | hit     | h10  |     1 | ✓   |
| zhongjiti-128        | short | hit    | hit     | f8   |     3 | ✓   |
| zhongjiti-129        | mid   | miss   | timeout | —    | 17955 | ✓   |
| gaojiti-221          | mid   | miss   | timeout | —    |  2767 | ✓   |
| gaojiti-222          | long  | miss   | timeout | —    |   708 | ✓   |
| gaojiti-210          | mid   | miss   | timeout | —    |  6139 | ✓   |
| gaojiti-220          | long  | miss   | timeout | —    |  5274 | ✓   |

## 结论

- **短杀可用**：自研叉 / VCF 双杀、zhongjiti-127/128 在唐僧 400ms 内稳定命中。
- **时限缺口**：synthetic-open-three、zhongjiti-129、gaojiti-221/222 在节点/深搜下可解，但对局 VCT 窗常 timeout —— 优先考虑加深 `vctBudgetMs` / 节点，而非先改根策略。
- **未证样例**：gaojiti-210/220 深搜 8s 仍空，可能假阴性或需核对题面；不阻塞进 #74 学堂（用已命中短题冷启动）。
- **下一步建议**：开「VCT 预算加深」Issue；学堂题包先收录 expectTangHit=true 档。
