# 棋力路线：对标结论与三层策略

> **决策记录（轻量）**：开源对标后的结论；指导排期，不替代实现规格。  
> **实现规格**（下一刀）：[tang-seng-strength.md](./tang-seng-strength.md)。  
> **训练仓长期**：[alphazero-lite.md](./alphazero-lite.md)、[zen-gomoku-ml](https://github.com/IdEvEbI/zen-gomoku-ml)。

| 项     | 内容                                    |
| ------ | --------------------------------------- |
| 状态   | 已确认（2026-08-06）                    |
| 目标   | 追求「棋力最强」时的分层定义与先后顺序  |
| 非目标 | 星数攀比；本页不规定具体 API / 参数数值 |

---

## 1. 对标摘要（GitHub stars 快照 2026-08-06）

Stars 只表示关注度，**棋力以对局与引擎强度为准**。

### 1.1 C++（引擎向）

| 仓库                                                                            | Stars | 启示                                   |
| ------------------------------------------------------------------------------- | ----- | -------------------------------------- |
| [dhbloo/rapfi](https://github.com/dhbloo/rapfi)                                 | ~244  | 开源顶流：αβ + 古典/NNUE；Gomocup 生态 |
| [gomoku/Carbon-Gomoku](https://github.com/gomoku/Carbon-Gomoku)                 | ~110  | 强古典 AI，非 H5 产品形态              |
| [keyu-tian/Cpp-Gomoku-with-AI](https://github.com/keyu-tian/Cpp-Gomoku-with-AI) | ~91   | 算杀 / 威胁模块可学                    |

另：闭源 **Yixin** 为人机冠军级标尺，不在公开星榜内。

### 1.2 前端（浏览器向）

| 仓库                                                          | Stars | 启示                               |
| ------------------------------------------------------------- | ----- | ---------------------------------- |
| [lihongxun945/gobang](https://github.com/lihongxun945/gobang) | ~1800 | **纯前端棋力标杆**：JS αβ + 形评分 |
| [mumuy/gobang](https://github.com/mumuy/gobang)               | ~214  | 人气样例，算法深度通常弱于上者     |
| [yyjhao/HTML5-Gomoku](https://github.com/yyjhao/HTML5-Gomoku) | ~85   | NegaScout + **Web Worker**         |

### 1.3 Python（训练 / AZ 向）

| 仓库                                                                                | Stars | 启示                                       |
| ----------------------------------------------------------------------------------- | ----- | ------------------------------------------ |
| [junxiaosong/AlphaZero_Gomoku](https://github.com/junxiaosong/AlphaZero_Gomoku)     | ~3600 | MCTS + Policy/Value 教学标杆；15×15 成本高 |
| [opendilab/LightZero](https://github.com/opendilab/LightZero)                       | ~1600 | MCTS/MuZero 研究框架                       |
| [initial-h/AlphaZero_Gomoku_MPI](https://github.com/initial-h/AlphaZero_Gomoku_MPI) | ~220  | 并行自对弈参考                             |

---

## 2. 相对本仓 SWOT（压缩）

|       |                                                                                   |
| ----- | --------------------------------------------------------------------------------- |
| **S** | 产品完整（四级、双规则、开局书、悔棋、SDD）；双仓分工；老师棋谱管线；活三必应已修 |
| **W** | 叶子评估偏粗；缺形分 / 短 VCT；纯 TS 主线程 NPS 低；弱老师纯模仿天花板低          |
| **O** | 对齐 gobang 的形与威胁即可跃迁 H5 体感；WASM 引擎档；强老师 + P/V + 自对弈        |
| **T** | 把「最强」等同于 Rapfi/Yixin 会路线摇摆；只加深 depth 不改评估收益差              |

**一句话**：纯 TypeScript 加深 Minimax **冲不上**引擎顶流；短期应追齐 **gobang 级 H5**，中期做 **可进化老师**，上限再碰 **WASM/C++ 或大规模 AZ**。

---

## 3. 三层「最强」定义

| 层     | 名称         | 成功标准                           | 主战场               |
| ------ | ------------ | ---------------------------------- | -------------------- |
| **P0** | H5 最强唐僧  | 认真下很难赢浏览器内「唐僧」       | 本仓古典增强         |
| **P1** | 可进化老师   | 策略可自改进，非永久模仿弱 Minimax | zen-gomoku-ml        |
| **P2** | 绝对棋力上限 | 逼近开源顶流 / 可客观 Elo          | WASM·C++ 或大规模 AZ |

产品上：**西游四级**继续服务人机梯度；若上引擎档，应作**独立更强对手**，勿与「唐僧」混名。

---

## 4. 排期原则

1. **立即（P0）**：按 [tang-seng-strength.md](./tang-seng-strength.md) 做威胁检测 + 形分 +（推荐）Worker；对标 gobang，**不上 ONNX**。
2. **老师数据**：威胁版唐僧稳定后再大批量导出；避免用弱老师锁死模仿上限。
3. **ML（P1）**：「纯模仿 → ONNX」降为**过渡**；目标升格为 **Policy + Value + 自对弈/MCTS**（见 alphazero-lite 后续切片）。
4. **P2** 另开议题：Rapfi 类嵌入或自研引擎协议（如 Gomocup），与 H5 唐僧验收分离。

---

## 5. 与现有文档关系

| 文档                                             | 关系                                 |
| ------------------------------------------------ | ------------------------------------ |
| [ai-agents.md](./ai-agents.md)                   | 四级参数与已上线能力                 |
| [tang-seng-strength.md](./tang-seng-strength.md) | **P0 实现交接**（本文不重复 API）    |
| [alphazero-lite.md](./alphazero-lite.md)         | 双规则 / 双模型 / 训练仓；P1–P2 长期 |
| 本页                                             | **为何这样排期**；开源对标摘要       |

---

## 修订记录

| 日期       | 说明                                                        |
| ---------- | ----------------------------------------------------------- |
| 2026-08-06 | 初稿：对标摘要 + SWOT + 三层策略；供 docs 合入与 Issue 引用 |
