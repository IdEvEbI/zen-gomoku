# VCT 求解器（设计草案 · #70）

> **状态**：设计已拍板，**尚未实现**。实现落点预定 `src/ai/vct.ts`；根策略见 [tang-seng-strength.md](./tang-seng-strength.md)。  
> 前置已交付：[vcf.md](./vcf.md) / Issue [#69](https://github.com/IdEvEbI/zen-gomoku/issues/69)。  
> 本页 Issue：[#70](https://github.com/IdEvEbI/zen-gomoku/issues/70)。

| 项       | 决策（2026-08-07）                                                                     |
| -------- | -------------------------------------------------------------------------------------- |
| 野心     | **A**：可用中短 VCT（对局明显变凶即可），**不**冲 Renjusolver 级长杀完美求解           |
| 启用范围 | **#70 仅唐僧**；猪/悟后续人设切片再开，避免一刀兼顾四级                                |
| 骨架     | 在现有 VCF **AND-OR** 上扩展活三/叉；冲四收窄局面 **复用** `vcfExists` / `findVcfMove` |
| 非目标   | 完整 Allis Dependency Graph、Proof-Number Search、照搬 Rapfi C++、Worker（可后置）     |

---

## 1. 定义与边界

| 概念      | 本仓含义                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------ |
| **VCF**   | 攻方只靠冲四/活四；守方只堵胜点（已实现）                                                        |
| **VCT**   | Victory by Continuous Threats：攻方可连续使用 **冲四 + 活三 + 双威胁叉** 等强迫着，直至双杀/成五 |
| **强迫**  | 守方若不按必应点应手，攻方下一步可升为更强威胁（活四/冲四/成五）或已双杀                         |
| **与 αβ** | VCT 是根/战术**探针**（对齐 Rapfi「战术 VCF + 主搜 αβ」思路）；中盘仍靠 Minimax                  |

禁手：进攻着合法过滤与 VCF 相同（依赖 `forbidden-moves` / 形检测）；难题回归逐步加，不挡 MVP。

---

## 2. 为何不闭门造车（参考）

| 来源                                                                                        | 可借鉴                   | 本仓取舍                                    |
| ------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------- |
| Allis Threat-Space / DB-search；[renju.se proof ch.5](https://renju.se/rif/proof/chap5.pdf) | AND-OR、威胁分层         | **思想**；不做完整依赖图                    |
| RAOTS（VCT Discovery / AND-OR + 着法分类）                                                  | 过滤无用着、排序、剪枝   | MVP 采用分类 + 分支截断                     |
| Pela / Renjusolver（Gomocup）                                                               | 强 VCT 对照验题          | **对照题**，不抄内核                        |
| [dhbloo/rapfi](https://github.com/dhbloo/rapfi)                                             | 主搜 αβ，叶子/探针战术杀 | 保持「探针 + αβ」分层                       |
| [MacroXie04/DeepFive](https://github.com/MacroXie04/DeepFive)                               | VCF/VCT 强迫搜 + 排序    | API 形态可参考                              |
| kigster gomoku-ansi-c 根序教训                                                              | 软着压过攻方 VCT         | **根纪律必修**：己方 VCF/VCT 优先于软活三挡 |

社区口碑：纯 VCT 求解开源以 **Pela** 较强；顶级对弈引擎未必把「完美 VCT」当唯一大脑。

---

## 3. 搜索结构（相对 VCF 的增量）

显式 `sideToMove`；攻方固定（与 `vcf.ts` 一致）。

```txt
attackNode（OR）
  ├─ 即时成五 → 胜
  ├─ 候选：叉/双威胁 > 冲四 > 单活三（截断 MAX_ATTACK_BRANCH）
  ├─ 落子后若冲四线已够 → 可短路进 VCF 子搜
  └─ 否则 → defendNode

defendNode（AND）
  ├─ 守方一步胜 → 攻方失败（反杀）
  ├─ 攻方胜点 ≥ 2 → 攻方胜
  ├─ 攻方胜点 = 1 → 只堵该点（同 VCF）
  ├─ 攻方活四端 → 堵对应端点（集合可能 >1，AND）
  ├─ 攻方活三强迫 → 枚举合理挡点；仅当每个挡后仍 VCT → 胜
  └─ 挡点过多 / 无明确强迫 → 本层失败或截断（防爆炸）
```

### 3.1 进攻排序（草案）

1. 一步胜
2. 落子后胜点 ≥2 或双活四向（叉）
3. `findFourThreatMoves`
4. `findOpenThreeMoves` / `findForkThreeMoves`（与 `threats.ts` 对齐，避免第二套形定义）
5. 截断前 N 枝（建议起步 8～12，可配）

### 3.2 守方挡点

- **硬**：对方胜点、活四端（与现软/硬防分层一致）。
- **活三**：`listSoftDefenseCandidates` 中活三相关点，或形模块导出的「堵该活三」集合。
- **帽**：单节点最多试 `MAX_DEFENSE_BRANCH`（建议 6～8）；超出则该进攻着视为「本预算未证」，不误报胜。

### 3.3 复用 VCF

任一节点若攻方仅存在冲四类强迫、无「仅靠活三」的分支需求，调用：

- `vcfExists(board, attacker, side, { maxPly, maxNodes, shouldAbort })`

避免 VCT 树在冲四尾段重复实现。

### 3.4 对外 API（预定）

| 函数                                           | 行为                      |
| ---------------------------------------------- | ------------------------- |
| `vctExists(board, attacker, sideToMove, opts)` | 是否存在 VCT              |
| `findVctMove(board, player, opts)`             | 轮到 `player` 的 VCT 首着 |
| `findVctDefense(board, toPlay, opts)`          | 打破对方 VCT 的候选点     |
| `hasVct`                                       | 语法糖                    |

Options：`maxPly`、`maxNodes`、`shouldAbort`、`rules`、`radius`；可选 `attackBranch` / `defenseBranch`。

---

## 4. 根策略（`rootPolicy`）变更

目标顺序（唐僧，高 → 低）：

1. 己方一步胜 / 硬必防 / 己方活四 / 双胜点快路径 / 叉对杀
2. **己方 VCF**（快、分支小）→ terminal
3. **己方 VCT**（预算内）→ terminal
4. **对方 VCF/VCT 必防**（`findVcfDefense` / `findVctDefense`）→ terminal
5. 软威胁（活三端等）→ 挡或受限 αβ + 防守底线
6. 全盘 αβ

相对现状：把「深层 VCF」从「无软威胁才搜」提前到 **软挡之前**；VCT 紧随 VCF。  
这直接修 VCF 文档与对局里「有杀先挡软三」的体验洞。

猪八戒 / 孙悟空：**#70 不设 `vctMaxPly`**（保持 0）；VCF 参数维持现状或不动。

---

## 5. 唐僧参数（草案，实现时再标定）

| 参数                        | 建议起步 | 说明                                    |
| --------------------------- | -------- | --------------------------------------- |
| `vcfMaxPly` / `vcfBudgetMs` | 12 / 400 | 已有；可略减若与 VCT 抢时               |
| `vctMaxPly`                 | 10～14   | 半步；野心 A                            |
| `vctBudgetMs`               | 300～500 | 与唐僧总时限 1000ms 共享；`shouldAbort` |
| `maxNodes`（VCT）           | 8k～20k  | 防主线程卡死                            |
| `MAX_ATTACK_BRANCH`         | 8～12    |                                         |
| `MAX_DEFENSE_BRANCH`        | 6～8     |                                         |

验收不要求解出全部超长 VCT 题；要求：**常见中短杀能找着，且预算内必返回**。

---

## 6. 验收（#70）

### 6.1 自动化

- [ ] `vct.test.ts`：活三起手的短 VCT；三三/三四双杀；被反杀打断；无解返回 null
- [ ] 与 VCF 回归不互相破坏
- [ ] 根策略：构造「己方有 VCF/VCT + 对方活三」局面 → **走杀不走软挡**

### 6.2 对照 / 人工

- [ ] 精选 3～5 道公开 VCT 题导入 `fixtures/records/`（合规：手工、注明来源；见 [puzzle-import.md](../development/puzzle-import.md)）
- [ ] 唐僧多局：中盘连续威胁不再「只会挡活三」
- [ ] 猪/悟行为与 #69 后一致（未误开 VCT）

### 6.3 文档回填

实现后：本文改为 **as-built**；更新 `tang-seng-strength.md` / `ai-agents.md` / `vcf.md` §根策略。

---

## 7. 实现切片顺序（建议）

1. 本文合入（设计先行）
2. `feature/vct-solver`：`vct.ts` + 单测（先 freestyle，禁手跟 VCF 钩子）
3. `rootPolicy` + 唐僧 `difficulty` 参数 + 根优先级修复
4. fixtures 对照题 + 文档 as-built
5. PR Closes #70

猪/悟开 VCT、Worker、更深求解 → **另开 Issue**，不进 #70 范围。

---

## 8. 风险

| 风险              | 缓解                                    |
| ----------------- | --------------------------------------- |
| 活三挡点枚举爆炸  | 防守分支帽；未证 ≠ 误报胜               |
| 形定义不一致      | 只调 `threats.ts`，VCT 不自建第二套     |
| 总时限被 VCT 吃光 | VCF 先、VCT 后；共享 abort；失败降级 αβ |
| 禁手漏杀/误杀     | 规则过滤 + 专题回归，不挡 freestyle MVP |

---

## 修订记录

| 日期       | 说明                                                    |
| ---------- | ------------------------------------------------------- |
| 2026-08-07 | 初稿：野心 A、仅唐僧、AND-OR 扩活三、根序修复、参考开源 |
