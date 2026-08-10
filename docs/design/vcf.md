# VCF 求解器（as-built）

> 实现：`src/ai/vcf.ts`。根策略接入见 [tang-seng-strength.md](./tang-seng-strength.md)；总览 [ai-agents.md](./ai-agents.md)。  
> **本切片目标**：可靠识别「连续冲四逼杀」；**不是**完整 VCT（不含系统活三强迫树）。

| 项   | 内容                                                                   |
| ---- | ---------------------------------------------------------------------- |
| 状态 | 已落地（Issue [#69](https://github.com/IdEvEbI/zen-gomoku/issues/69)） |
| API  | `findVcfMove` / `findVcfDefense` / `vcfExists` / `hasVcf`              |
| 唐僧 | `vcfMaxPly=12`，`vcfBudgetMs=400`（`difficulty.ts`）                   |

---

## 1. 定义与边界

| 概念         | 本仓含义                                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| **VCF**      | Victory by Continuous Four：攻方只靠冲四/活四类强迫着，迫使守方堵胜点，直至双杀或成五 |
| **守方模型** | **只堵当前胜点**；不扩展「挡活三」等软防                                              |
| **双杀**     | 攻方同时存在 ≥2 个胜点 → 守方无法一手全堵 → 攻方胜                                    |
| **非目标**   | 完整 VCT；开局书；中盘「计划」；置换表持久化                                          |

禁手规则下：进攻着经 `isLegalMove` / 形检测过滤（依赖 `forbidden-moves`）；同一题自由与禁手的首着可能不同（例：zhongjiti-127）。

---

## 2. 搜索结构（AND-OR）

显式 `sideToMove`，便于「轮到攻方 / 守方」假想检测。

```txt
attackNode（OR）
  ├─ 即时成五 → 胜
  ├─ 按胜点数排序的冲四着（最多 MAX_ATTACK_BRANCH=8）
  └─ 试着后进入 defendNode

defendNode（AND）
  ├─ 守方已有一步胜 → 攻方 VCF 失败（被反杀打断）
  ├─ 攻方胜点 = 0 → 失败（非强迫）
  ├─ 攻方胜点 ≥ 2 → 攻方胜（双杀）
  └─ 胜点 = 1 → 守方只堵该点，再回 attackNode
```

置换：局面键（占子 + 攻方 + 行棋方 + 剩余 ply）→ 布尔结果。  
节点上限默认 `8_000`（可 `maxNodes` 覆盖）；`shouldAbort` 对接唐僧时限。

### 2.1 进攻排序

1. 已有一步胜 → 直接返回那些点
2. 否则 `findFourThreatMoves`：落子后统计己方胜点数
3. 胜点多者优先；截断前 8 枝

无冲四类着 → 立刻判定无 VCF（该节点失败）。

### 2.2 对外 API

| 函数                                           | 行为                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `vcfExists(board, attacker, sideToMove, opts)` | 从指定行棋方起，攻方是否存在 VCF                                         |
| `findVcfMove(board, player, opts)`             | 轮到 `player` 时的 VCF 首着（若有）                                      |
| `analyzeVcfDefense(board, toPlay, opts)`       | `none` / `broken` / `unavoidable` + 可破点（双杀等已必负为 unavoidable） |
| `findVcfDefense(board, toPlay, opts)`          | `analyzeVcfDefense` 的可破点列表；必负时 `[]`                            |
| `hasVcf`                                       | `findVcfMove !== null`                                                   |

防守候选优先取自对方冲四着及其胜点，避免全盘扫描。

---

## 3. 根策略中的位置（`rootPolicy`）

唐僧根相位顺序（节选 · #81）：

1. 己方一步胜 / 硬必防 / 己方活四 / 双胜点快路径
2. **己方 VCF**
3. **对方活四端** → **对方 VCF 必防** → 叉对杀 / 叉软搜 / **己方 VCT** → **对方 VCT 必防**
4. 软威胁 → αβ

活四端先于 VCF 必防；VCF 必防先于叉对杀（避免抢叉放过可破杀）。

---

## 4. 参数与性能

| 参数                | 默认       | 说明                               |
| ------------------- | ---------- | ---------------------------------- |
| `maxPly`            | 12（唐僧） | 半步深度（攻守各计一层）           |
| `maxNodes`          | 8_000      | 单次求解节点帽                     |
| `MAX_ATTACK_BRANCH` | 8          | 进攻分支截断                       |
| `vcfBudgetMs`       | 400        | 根上 VCF 墙钟预算（`shouldAbort`） |

对照题（`fixtures/records/wuziqi123/`）在放宽 `maxPly`/`maxNodes` 时可完整解出长杀；对局里唐僧受 400ms / ply12 约束，极长 VCF 可能搜不全——属预期折中。

---

## 5. 验题样本

| 题            | 文件                                            | 首着（现求解器）   |
| ------------- | ----------------------------------------------- | ------------------ |
| zhongjiti/127 | `fixtures/records/wuziqi123/zhongjiti-127.json` | 禁手 h14；无禁 h10 |
| zhongjiti/128 | `…/zhongjiti-128.json`                          | f8                 |
| zhongjiti/129 | `…/zhongjiti-129.json`                          | g13                |

导入与坐标：[puzzle-import.md](../development/puzzle-import.md)。  
单元测试：`src/ai/vcf.test.ts`。

---

## 6. 后续（非本切片）

| 主题      | 说明                                     |
| --------- | ---------------------------------------- |
| 根优先级  | ✅ #70 / #81：杀棋与活四紧迫级已理顺     |
| 更深/更快 | 置换表增强、迭代加深、Worker             |
| **VCT**   | ✅ [vct.md](./vct.md) as-built（仅唐僧） |
| 教学闯关  | 求解器验题 + 关卡 JSON（#74）            |

---

## 修订记录

| 日期       | 说明                                           |
| ---------- | ---------------------------------------------- |
| 2026-08-07 | 初稿：AND-OR、守方只堵胜点、根策略位置、对照题 |
| 2026-08-07 | #81：`analyzeVcfDefense`；活四先于 VCF 必防    |
