# 唐僧棋力：威胁搜索 + 根策略 + 形分（已落地规格）

> **仓库**：zen-gomoku。古典增强路径；**不要**指望 zen-gomoku-ml 的 ONNX 模仿短期替代唐僧。  
> **实现 PR**：[\#68](https://github.com/IdEvEbI/zen-gomoku/pull/68)（威胁 / 形分 / 根策略迭代）。相关总览见 [ai-agents.md](./ai-agents.md)、路线图 [strength-roadmap.md](./strength-roadmap.md)。

| 项       | 内容                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 状态     | **已落地**（`feature/tang-threat-search` → PR \#68）                                 |
| 目标     | 认真下也很难赢「唐僧」；freestyle；H5 有硬时限仍可玩                                 |
| 非目标   | 数学「无敌」；完整职业 VCF/VCT 引擎；本阶段神经网络当唐僧                            |
| 能力边界 | **VCF**（[vcf.md](./vcf.md)）+ **VCT**（[vct.md](./vct.md)，#70 仅唐僧）；无持久计划 |

---

## 1. 四级难度（与代码一致）

| 等级   | 实现              | 参数（`difficulty.ts`）                                                                                                                                                                     |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 沙和尚 | `ShaHeshangAgent` | Top-K + `listForcedReplies` 必应                                                                                                                                                            |
| 猪八戒 | `HeuristicAgent`  | 赢法启发 + 形分；`listForcedReplies`                                                                                                                                                        |
| 孙悟空 | `MinimaxAgent`    | `maxDepth=2`，`timeLimitMs=180`，`candidateLimit=12`；无威胁 DFS                                                                                                                            |
| 唐僧   | `MinimaxAgent`    | `maxDepth=6` + ID，`timeLimitMs=1500`，`candidateLimit=16`，`vcfMaxPly=14`，`vcfBudgetMs=300`，`vcfMaxNodes=50k`，`vctMaxPly=16`，`vctBudgetMs=1200`，`vctMaxNodes=80k`，`softRootLimit=16` |

开局：`openingBook.ts`（花月/浦月/斜二等 + 八对称）——改善开局单调，**不**解决中盘战术洞。

---

## 2. 模块职责（架构）

```txt
difficulty.ts          → 配置 → Agent
MinimaxAgent.ts        → αβ / 时限 / 候选展开（不堆根特例）
rootPolicy.ts          → 根相位：何时短路、搜什么、如何与防守底线合并
threats.ts             → 形检测、硬/软防、择优
vcf.ts                 → VCF 求解（连续冲四；守方只堵胜点）→ 详见 vcf.md
vct.ts                 → VCT 求解（冲四+活三+叉；复用 VCF）→ 详见 vct.md
evaluate.ts            → 叶子赢法分 + 形分（冲四 / 可成活四）
```

| 路径                     | 职责                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `src/ai/threats.ts`      | 胜 / 冲四 / 活四端 / 活三 / 叉；硬软防；`scoreForcedReply`；遗留 `findForcedWinMove` |
| `src/ai/vcf.ts`          | 见 [vcf.md](./vcf.md)：`findVcfMove` / `findVcfDefense` / `vcfExists`                |
| `src/ai/vct.ts`          | 见 [vct.md](./vct.md)：`findVctMove` / `findVctDefense` / `vctExists`                |
| `src/ai/rootPolicy.ts`   | `planRootPhase` / `pickForkRaceMove` / `resolveSearchWithDefenseFloor`               |
| `src/ai/MinimaxAgent.ts` | 迭代加深 αβ；调用 rootPolicy；超时返回当前最佳                                       |
| `src/ai/evaluate.ts`     | `evaluateBoard` / `scoreEmptyCell` 形分（叶子不算叉，控 NPS）                        |
| `src/ai/threats.test.ts` | 形与棋谱回归（漏防 / 抢攻纪律）                                                      |
| `src/ai/vcf.test.ts`     | VCF 单元与对照局面                                                                   |
| `src/ai/vct.test.ts`     | VCT 单元与根优先级回归                                                               |

---

## 3. 根节点决策（`planRootPhase`）

顺序（高 → 低），与实现一致：

1. **己方一步胜** → terminal
2. **硬必防**（对方下一步可成五）→ `pickBestForcedReply` → terminal
3. **己方活四（可成活四点）** → terminal
4. **己方双胜点快路径**（冲四着落子后胜点≥2 / 直接胜）→ terminal
5. **己方 VCF**
6. **对方活四端**（`measureThreatResidual` 择优）→ **对方 VCF 必防**（`analyzeVcfDefense`）
7. **叉对杀抢攻**（`pickForkRaceMove`；仅当对方无待破 VCF）
8. 对方叉：**统一强迫着**（`pickBestForcingMove` / 应手后局面）→ 否则软搜
9. **己方 VCT** → **对方 VCT 必防**
10. 其余软威胁 / 全盘 αβ

> **#81**：多活四端残留威胁模型；VCF 必防压过叉对杀；有叉时强迫着按应手后 VCT/VCF 残留择优（禁假冲四）。

### 3.1 防守底线（`resolveSearchWithDefenseFloor`）

- 搜索着若不在软挡集合内：对方仍有胜点 / 活三端 / **叉** → 回退底线最优挡
- 仅当落子后己方 ≥2 活四向，且对方**无**活三端、**无**叉时，才允许越出底线抢攻
- 同档比较用 `scoreForcedReply`（越小越好；底层为 `scoreThreatResidual`）

### 3.2 形定义（`threats.ts`，与单测一致）

| 名       | 实现含义                                                        |
| -------- | --------------------------------------------------------------- |
| 一步胜   | 落子后 `checkWinner`                                            |
| 冲四类   | `findFourThreatMoves`：落子后存在「下一步可胜」点               |
| 活四端   | `findOpenFourMoves`：落子形成真活四（两端可延伸的四）可成点     |
| 活三     | `findOpenThreeMoves`：落子后存在冲四点（未直接胜、未已是冲四）  |
| 双杀叉   | `findForkThreeMoves`：落子后新增多方向/多活四向等（见源码条件） |
| 硬必防   | `listHardForcedReplies` = 对方 `findWinningMoves`               |
| 软防分层 | 互斥：活四端 → 叉 → 冲四预备（`listSoftDefenseCandidates`）     |

短威胁 DFS：**只扩展冲四/活四类进攻与对应必防**，不是完整 VCT（不含系统活三强迫树）。

---

## 4. 评估（`evaluate.ts`）

- 赢法计数分 + 形分：`SHAPE_SELF_FOUR` / `SHAPE_SELF_OPEN_THREE`（及对方对应）；进攻略重
- `SHAPE_*_FORK` 常量保留给根/文档；**叶子不算叉**（NPS）
- 猪八戒与搜索叶子共用形检测，深度仍是四级主梯度

---

## 5. 验收（相对本切片）

### 5.1 自动化

- [x] `threats`：冲四/活三/一步胜与必防择优
- [x] 棋谱回归：枢纽叉、多活三端、持平不抢叉、留叉不抢双活四等
- [x] Heuristic / Minimax / Sha 相关测试不回退
- [x] CI / `vitest` AI 套件

### 5.2 产品体验（持续）

- [ ] 人机唐僧多局认真冲活三/冲四：无明显「必挡漏防」（随版本回归）
- [x] 四级梯度：沙 < 猪 < 悟空 < 唐僧
- [x] 开局书行为保留
- [x] 唐僧硬时限 1s，超时有返回（主线程；Worker 仍为可选后续）

---

## 6. 已知局限与后续（本文不展开实现）

| 主题           | 说明                                                      |
| -------------- | --------------------------------------------------------- |
| VCF 深化       | 见 [vcf.md](./vcf.md)；根上 VCF 优先于软挡；加长 ply/预算 |
| VCT            | 系统活三强迫树；与娱乐性/时限需产品权衡                   |
| 阵型/中盘计划  | 现以威胁表 + 浅 αβ 为主，无持久「主线」                   |
| Web Worker     | 深搜时保 UI 流畅；Store 仍不持搜索树                      |
| 禁手规则威胁   | 依赖 forbidden-moves；另切片                              |
| ML / AlphaZero | 训练仓实验「第五对手」，**不是**唐僧替代路径（见 §9）     |

---

## 7. 与训练仓关系

| 仓库                   | 职责                               |
| ---------------------- | ---------------------------------- |
| **zen-gomoku（本仓）** | 唐僧古典增强（本文）；开局书；人机 |
| **zen-gomoku-ml**      | ONNX 模仿等；Policy **不含**搜索   |

---

## 修订记录

| 日期       | 说明                                                                  |
| ---------- | --------------------------------------------------------------------- |
| 2026-08-06 | 初稿：交接规格（威胁 + 评估 + 参数）                                  |
| 2026-08-06 | 实现落地：`threats` + 形分 + 唐僧参数                                 |
| 2026-08-07 | 根策略 `rootPolicy`；凶棋风与对杀纪律；文档改为与代码对齐的已落地规格 |
| 2026-08-07 | #69 VCF：链到 [vcf.md](./vcf.md)                                      |
| 2026-08-07 | #70 VCT：仅唐僧；根序杀棋优先于软挡；见 [vct.md](./vct.md)            |
| 2026-08-07 | #81：`ThreatResidual` 统一必防；多活四/双 VCF 分析 API                |
| 2026-08-10 | #81：有叉时强迫着按应手后 VCT 残留择优（`inspectForcingOutcome`）     |
