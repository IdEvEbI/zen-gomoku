# 唐僧棋力：威胁搜索 + 根策略 + 形分（已落地规格）

> **仓库**：zen-gomoku。古典增强路径；**不要**指望 zen-gomoku-ml 的 ONNX 模仿短期替代唐僧。  
> **实现 PR**：[\#68](https://github.com/IdEvEbI/zen-gomoku/pull/68)（威胁 / 形分 / 根策略迭代）；后续 #69/#70/#81/#85/#87。  
> 相关总览见 [ai-agents.md](./ai-agents.md)、路线图 [strength-roadmap.md](./strength-roadmap.md)、VCT [vct.md](./vct.md)。

| 项       | 内容                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 状态     | **已落地并持续 hardening**（威胁 / VCF / VCT / academy bench）                           |
| 目标     | 认真下也很难赢「唐僧」；freestyle 先稳；H5 有硬时限仍可玩                                |
| 非目标   | 数学「无敌」；完整职业引擎；本阶段神经网络当唐僧；未定型前大拆 `rootPolicy`              |
| 能力边界 | **VCF**（[vcf.md](./vcf.md)）+ **VCT**（[vct.md](./vct.md)，仅唐僧，野心 A）；无持久计划 |

---

## 0. 研发约定（2026-08-11）

1. **文档先行**：改根短路 / 真双 / 强迫着语义前，先改本文 §3 与 [vct.md](./vct.md)，再开 Issue/PR。
2. **固定阶梯、禁止全局加分**：一类失败模式（RESULTS 码）= 一个小 PR + 回归棋谱；不为抬命中率加全局 bonus。
3. **题库门禁**：先 academy beginner **首着**全中 → 中级 → 高级/VCT 手拣 → 再禁手与抓禁手。
4. **人设后置**：唐僧相对定型后，再旋钮化弱化出悟/猪/沙（见 [strength-roadmap.md](./strength-roadmap.md) §4）。
5. **重构边界**：允许按相位拆文件 / 收紧 API；**禁止**未过 beginner 门禁前重写搜索骨架。

---

## 1. 四级难度（与代码一致）

| 等级   | 实现              | 参数（`difficulty.ts`）                                                                                                                                                                     |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 沙和尚 | `ShaHeshangAgent` | Top-K + `listForcedReplies` 必应                                                                                                                                                            |
| 猪八戒 | `HeuristicAgent`  | 赢法启发 + 形分；`listForcedReplies`                                                                                                                                                        |
| 孙悟空 | `MinimaxAgent`    | `maxDepth=2`，`timeLimitMs=180`，`candidateLimit=12`；无威胁 DFS                                                                                                                            |
| 唐僧   | `MinimaxAgent`    | `maxDepth=6` + ID，`timeLimitMs=1500`，`candidateLimit=16`，`vcfMaxPly=14`，`vcfBudgetMs=300`，`vcfMaxNodes=50k`，`vctMaxPly=16`，`vctBudgetMs=1200`，`vctMaxNodes=80k`，`softRootLimit=16` |

开局：`openingBook.ts`（花月/浦月/斜二等 + 八对称）——改善开局单调，**不**解决中盘战术洞。  
赢法表：`winsTable.ts` —— 叶子与猪/沙启发；**不是**唐僧中盘主算力。

---

## 2. 模块职责（架构）

```txt
difficulty.ts          → 配置 → Agent
MinimaxAgent.ts        → αβ / 时限 / 候选展开（不堆根特例）
rootPolicy.ts          → 根相位：何时短路、搜什么、如何与防守底线合并
threats.ts             → 形检测、硬/软防、择优
vcf.ts                 → VCF 求解（连续冲四；守方只堵胜点）→ 详见 vcf.md
vct.ts                 → VCT 求解（冲四+活三+叉；内嵌 VCF）→ 详见 vct.md
evaluate.ts            → 叶子赢法分 + 形分（冲四 / 可成活四）
openingBook.ts         → 开局定式
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

## 3. 根节点决策契约（`planRootPhase`）

> **契约**：下列档位高者必须压过低者；低档不得用启发式「加分」压过高档。  
> 实现细节可演进，**语义变更必须先改本节**。

### 3.0 VCF 与 VCT 如何混用（实战）

实战杀线多为 **冲四段 + 活三/叉段** 交替，不是两套互斥模式：

| 层         | 行为                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **VCF**    | 纯连续冲四；便宜、好证                                               |
| **VCT**    | `VCF ⊆ VCT`：攻方节点有冲四/胜点时先 `vcfExists`；否则扩展活三/叉    |
| **根上**   | 先廉价整盘 VCF；再完整 VCT（`confirmRootVctAttack`）；冲四留叉作桥梁 |
| **证不出** | 降级软挡 / 防守底线 / αβ                                             |

详见 [vct.md](./vct.md) §1.1。

### 3.1 紧迫阶梯（高 → 低）

1. **己方一步胜** → terminal
2. **硬必防**（对方下一步可成五）→ terminal
3. **己方活四**（`findOpenFourMoves`，落子即形成活四）→ terminal
4. **己方双胜点**（冲四后胜点 ≥2 / 直接胜）→ terminal
5. **己方 VCF**
6. **对方活四 / 对方 VCF 必防**（可先试**已强制**的己方杀，见 §3.2）
7. **已强制真双**（§3.2）→ 可压过对方软叉 / 软可成活四
8. **叉对杀**（`pickForkRaceMove`；假双空残留不得抢）
9. 对方叉：**确认 VCT** → 强迫着择优 → 冲四+四三（须硬残留）→ 软搜
10. **冲四留叉** → **己方 VCT** → **对方 VCT 必防**
11. 其余软威胁 / 全盘 αβ

### 3.2 「真双」语义（下一刀必须收紧）

| 术语             | 应有含义（契约）                                                                | 现状风险                                                                  |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **已强制真双**   | 落子后盘上已有对方必须应的双威胁：如胜点 ≥2，或**已形成**的双活四（挡一仍有杀） | —                                                                         |
| **可成活四双苗** | 落子后出现 ≥2 个「再下一手才成活四」的空点；**对方本手不必应**                  | `findTrueDualMove` / `isTrueOpenFourDual` 现多按此实现，易假阳性          |
| **根上可抢软防** | **仅**「已强制真双」或确认 VCT / 合法四三（应后对方无 VCT）                     | 实战昏招：`playtests` 对局 j11 把双苗当真双，放过对方 f8/j4（2026-08-11） |

**下一刀实现目标**：根短路抢攻不得用「可成活四双苗」压过对方软活四/软叉；academy 061/081–085 不回退；增加上述对局回归。

### 3.3 防守底线（`resolveSearchWithDefenseFloor`）

- 搜索着若不在软挡集合内：对方仍有胜点 / 活三端 / **叉** → 回退底线最优挡
- 仅当落子后己方已强制双威胁，且对方**无**活三端、**无**叉时，才允许越出底线抢攻
- 同档比较用 `scoreForcedReply`（越小越好）

### 3.4 形定义（`threats.ts`，与单测一致）

| 名       | 实现含义                                                        |
| -------- | --------------------------------------------------------------- |
| 一步胜   | 落子后 `checkWinner`                                            |
| 冲四类   | `findFourThreatMoves`：落子后存在「下一步可胜」点               |
| 活四端   | `findOpenFourMoves`：落子形成真活四（两端可延伸的四）可成点     |
| 活三     | `findOpenThreeMoves`：落子后存在冲四点（未直接胜、未已是冲四）  |
| 双杀叉   | `findForkThreeMoves`：落子后新增多方向/多活四向等（见源码条件） |
| 硬必防   | `listHardForcedReplies` = 对方 `findWinningMoves`               |
| 软防分层 | 互斥：活四端 → 叉 → 冲四预备（`listSoftDefenseCandidates`）     |

---

## 4. 评估（`evaluate.ts`）

- 赢法计数分 + 形分：`SHAPE_SELF_FOUR` / `SHAPE_SELF_OPEN_THREE`（及对方对应）；进攻略重
- `SHAPE_*_FORK` 常量保留给根/文档；**叶子不算叉**（NPS）
- 猪八戒与搜索叶子共用形检测，深度仍是四级主梯度

---

## 5. 验收

### 5.1 自动化

- [x] `threats` / `vcf` / `vct` / 棋谱回归（junction、gaojiti、academy 061/081–085）
- [x] CI / `vitest` AI 套件
- [ ] **真双契约**：j11 对局回归 + 阶梯契约最小局面（待下一刀）
- [ ] academy beginner **首着**全中（门禁 A；见 `fixtures/records/academy/beginner/RESULTS.md`）

### 5.2 产品体验（持续）

- [ ] 人机唐僧多局：无明显「必挡漏防 / 假双抢攻」
- [x] 四级梯度：沙 < 猪 < 悟空 < 唐僧（人设重做前以深度/开关区分）
- [x] 开局书行为保留
- [x] 唐僧硬时限内有返回

---

## 6. 已知局限与后续切片

| 主题              | 说明                                         |
| ----------------- | -------------------------------------------- |
| 真双收紧          | §3.2；优先于 G/F/J 启发式                    |
| G/F/J/I           | academy RESULTS 失败模式；一类一 PR          |
| 题库升级          | beginner 门禁 A → 中级 → 高级/VCT 手拣       |
| 禁手 / 抓禁手     | freestyle 战术稳定后再做                     |
| 人设重做 #71      | 唐僧定型后：共享骨架 + 深度/VCT/攻守权重旋钮 |
| `rootPolicy` 整理 | 可按相位拆文件；过 beginner 门禁前不重写搜索 |
| Web Worker        | 深搜保 UI；Store 不持搜索树                  |
| ML / 如来         | 训练仓；非唐僧替代                           |

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
| 2026-08-11 | #85/#87 合入；§0 研发约定；§3 契约化；真双语义债务与 VCF⊆VCT 混用说明 |
