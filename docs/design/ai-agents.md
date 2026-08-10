# AI Agent 设计说明

## 文档信息

- **项目**：zen-gomoku
- **状态**：Phase 1/2 与四级对手**已上线**；参数见 §3.2
- **对应 Issue**：[#44](https://github.com/IdEvEbI/zen-gomoku/issues/44)

本文记录已上线的启发算法、Minimax + Alpha-Beta 与四级难度映射，便于调参与对照。

---

## 1. 接口与协作

所有 AI 实现统一走 `IAgent`：

```ts
interface IAgent {
  readonly name: string
  getNextMove(board: number[][]): Promise<AiMove | null>
}
```

- 棋盘约定：`0` 空、`1` 黑、`2` 白。
- 人机：`humanFirst` 为 true 时人执黑 AI 执白；为 false 时 AI 执黑人执白。
- 下一手颜色由 `nextPlayerFromBoard(board)` 推断（黑先；子数相等走黑）。
- Store 持有当前 Agent 实例与难度标识；**不把搜索树放进 Pinia**。
- 落子流程：轮到 AI →（短延迟）→ `agent.getNextMove(board)` → `placeStone`。

架构总览见 [technical-architecture.md §4](./technical-architecture.md)。

---

## 2. 现版：`HeuristicAgent`（Phase 1）

### 2.1 定位

**0 层搜索的赢法数组启发**：不对未来局面展开，只对当前空位打分取最高。能力上限清晰，适合作为难度标尺的「中档基准」。

### 2.2 赢法表（`winsTable.ts`）

- 预计算全部「五连赢法」：横、竖、两斜，共约 \(15\times11\times4\) 量级条（随棋盘尺寸变化）。
- `wins[row][col][k] === true` 表示交点 `(row,col)` 属于第 `k` 种赢法。
- 对局中维护（或按盘面重算）每条赢法上黑/白已占子数；落子点得分 = 该点相关赢法的攻防分之和。

### 2.3 评分

对每个候选空位累加：

| 己方已占（同赢法） | 分    | 对方已占 | 分    |
| ------------------ | ----- | -------- | ----- |
| 1                  | 220   | 1        | 200   |
| 2                  | 420   | 2        | 400   |
| 3                  | 2400  | 3        | 2000  |
| 4                  | 20000 | 4        | 10000 |

- 单点总分：**攻防累加** + 形分（冲四/活三，见 `threats.ts`）+ 微弱中心偏好。
- **进攻略重于防守**（同长度己方分略高；形分亦然）。

### 2.4 候选与开局

- 空盘：直接天元。
- 有子后：优先只评「邻域半径 2 内有子」的空位；若过滤为空则退回全空位。
- **一步胜**与 `listForcedReplies`（对方冲四/活三等）优先于软随机。
- 最高分并列时随机选一；若最高分 ≤ 0 则回退 `RandomAgent`。

### 2.5 能力边界（已知弱点）

- 猪八戒仍无主动搜索：双活三等组合依赖形分与必应，不如唐僧稳。
- 评分局部最优，中盘可能被「诱饵」带走。
- 耗时接近瞬时（形检测在邻域内，一般可接受）。

---

## 3. 四级对手映射（已认可）

以 **现版 HeuristicAgent** 为基准线：最弱必须弱于它，最强必须强于它。

| 等级 | 名称   | 相对现版     | 算法策略                                                            |
| ---- | ------ | ------------ | ------------------------------------------------------------------- |
| 1    | 沙和尚 | **明显更弱** | 启发 Top-K 抽样；**必应**一步胜/`listForcedReplies`；从不在全盘瞎下 |
| 2    | 猪八戒 | **≈ 启发**   | `HeuristicAgent`（形分 + 必应，0 层搜索）                           |
| 3    | 孙悟空 | **明显更强** | Minimax + α-β，浅深度；共用威胁候选排序                             |
| 4    | 唐僧   | **再强一档** | 更深搜索 + **VCF** + 威胁优先候选；硬时限                           |

默认等级建议：**猪八戒**（与当前人机体感接近，便于对比）。

> 命名与西游师徒由弱到强的民间印象不完全一致，此处以「对战难度递进」为准，不追求角色考据。

### 3.1 不建议的调参方式

- 仅用 depth = 0/1/2/3 四级：深度 1 体感常怪，且难保证「弱于现版启发」。
- 沙和尚也做成 Minimax depth 0：会与猪八戒撞车。

### 3.2 已定参数（#44 + #66）

| 等级   | Agent             | 关键参数                                                                                                                                           |
| ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 沙和尚 | `ShaHeshangAgent` | Top-K=`4`，`bestMoveChance=0.55`；必应一步胜/`listForcedReplies`；无全盘随机                                                                       |
| 猪八戒 | `HeuristicAgent`  | 0 层赢法启发 + 形分；必应同上                                                                                                                      |
| 孙悟空 | `MinimaxAgent`    | `maxDepth=2`，`candidateLimit=12`，`timeLimitMs=180`；威胁候选优先；无威胁 DFS                                                                     |
| 唐僧   | `MinimaxAgent`    | `maxDepth=6` + 迭代加深，`candidateLimit=16`，`timeLimitMs=1000`，`vcfMaxPly=12`，`vcfBudgetMs=300`，`vctMaxPly=12`，`vctBudgetMs=400`，软根含对杀 |

默认等级：**猪八戒**。切换等级仅影响后续 AI 手数（不强制重开）。

---

## 4. 已实现：`MinimaxAgent` + Alpha-Beta（Phase 2）

### 4.1 目标

在可接受的 H5 耗时内，提供可配置深度的博弈树搜索，叶子节点**复用**现有 wins 启发评估，而不是另起一套评分。

### 4.2 算法骨架

1. 根节点：由 `rootPolicy.planRootPhase` 统一决策——一步胜 / 硬必防 / 己方活四；**己方 VCF**；**对方活四端 → 对方 VCF 必防**；叉对杀；有叉时**统一强迫着**（应手后比杀）否则软搜；**己方 VCT → 对方 VCT 必防**（[vct.md](./vct.md)）；再 αβ。必防见 `measureThreatResidual`。
2. **走法生成**：`listThreatCandidates`（胜/硬软防守/冲四/叉）优先，再 `listOrderedCandidates` 启发补齐；威胁点截断前必留。
3. **递归**：交替落子；α-β 剪枝；触达深度或终局停止；层内同样威胁优先。
4. **叶子评估**：赢法计数分 + 形分（冲四/活三数量加权）。
5. **终局**：己方五连 → +∞ 档；对方五连 → −∞ 档。

模块：`src/ai/threats.ts`、`src/ai/vcf.ts`、`src/ai/vct.ts`（见 [tang-seng-strength.md](./tang-seng-strength.md)）。

### 4.3 与现版启发的关系

```txt
次优抽样 + 必应威胁     → 沙和尚
Heuristic + 形分        → 猪八戒（基准）
形分评估 + 浅搜         → 孙悟空
形分评估 + 深搜 + VCF/VCT → 唐僧
```

同一套评估函数贯穿 Phase 1～2，降低「搜索更深反而棋风突变」的风险。

### 4.4 UI / Store

- 人机模式下可选对手等级（下拉：沙和尚～唐僧）。
- `setAiDifficulty` 替换 Agent，**仅对后续 AI 手生效**（不强制重开）。
- AI 思考仍走 `aiThinking` + 短延迟；唐僧在加深层之间 `await` 让出主线程。

### 4.5 本阶段非目标

- 开局库、禁手规则、神经网络 / AlphaZero（**Phase 2 范围内**）。
- 完美解或职业级强度。
- 把搜索调试信息默认暴露给玩家。

> **后续路线（草案）**：自由/禁手双规则双模型 + 独立训练仓 + 模仿唐僧 → 自对弈，见 [alphazero-lite.md](./alphazero-lite.md)。设计已确认；实现按 backlog 切片推进，不在本文件四级参数内默认启用。  
> **棋力分层策略**：对标结论与 P0/P1/P2 见 [strength-roadmap.md](./strength-roadmap.md)。  
> **唐僧棋力增强（威胁搜索 + 评估）**：P0 交接规格见 [tang-seng-strength.md](./tang-seng-strength.md)（优先于 ML）。

---

## 5. 文件与演进

| 文件                        | 职责                           |
| --------------------------- | ------------------------------ |
| `src/ai/types.ts`           | `IAgent`、`AiMove`、盘面工具   |
| `src/ai/winsTable.ts`       | 赢法表与计数                   |
| `src/ai/evaluate.ts`        | 共用赢法评估、形分与候选生成   |
| `src/ai/threats.ts`         | 冲四/活三/必防与短威胁 DFS     |
| `src/ai/rootPolicy.ts`      | 根节点相位、软根候选、防守底线 |
| `src/ai/RandomAgent.ts`     | 纯随机                         |
| `src/ai/ShaHeshangAgent.ts` | 沙和尚（次优抽样 + 必应威胁）  |
| `src/ai/HeuristicAgent.ts`  | 启发 + 形分（猪八戒）          |
| `src/ai/MinimaxAgent.ts`    | αβ 搜索（悟空 / 唐僧）         |
| `src/ai/difficulty.ts`      | 等级枚举、名称、创建对应 Agent |

Phase 3（预留）：`AlphaZeroAgent`，仍实现 `IAgent`，与本文四级正交。

---

## 6. 验收对照

### #44（四级已上线）

- [x] 四级可选，名称：沙和尚 / 猪八戒 / 孙悟空 / 唐僧
- [x] 沙和尚体感弱于现版；猪八戒接近现版；悟空、唐僧强于现版（搜索加深）
- [x] 唐僧单步有时限 + 迭代加深，避免长时间卡死
- [x] 核心搜索 / 堵四 / 冲四有单元测试
- [x] 本文档已回填深度、时限、噪声等参数

### #66（威胁 + 形分）

- [x] `threats` 单测：冲四必挡、活三必应、一步胜优先
- [x] 唐僧对活三 / 活四强迫局面选出正确点
- [x] 唐僧参数：depth 6 / 1000ms / candidate 16 / vcfMaxPly 12 / vcfBudgetMs 400；软根含对杀
- [x] 沙/猪复用 `listForcedReplies`；悟空参数未升

---

## 修订记录

| 日期       | 说明                                                   |
| ---------- | ------------------------------------------------------ |
| 2026-08-04 | 初稿：记录 Heuristic 现状与四级 + Minimax 设计契约     |
| 2026-08-04 | 实现回填：Sha/Zhu/Wukong/Tang 参数与文件表             |
| 2026-08-04 | 沙和尚去掉全盘随机：改为次优抽样 + 必应四连            |
| 2026-08-04 | 文档同步：标注已上线；补充先后手 humanFirst（#49）     |
| 2026-08-05 | 链到 alphazero-lite 草案（禁手 + 小模型，未开发）      |
| 2026-08-06 | #66：威胁模块 + 形分；唐僧 depth/时限/threatSearchPly  |
| 2026-08-06 | 三刀调优：软根对杀、叶子活三/叉形分、唐僧 6×1000ms     |
| 2026-08-07 | #69：`vcf.ts`；唐僧 `vcfMaxPly=12` / `vcfBudgetMs=400` |
| 2026-08-07 | 链到 [vcf.md](./vcf.md)；根相位描述与实现对齐          |
| 2026-08-07 | #70：VCT（仅唐僧）；根序 VCF/VCT 优先于软挡            |
