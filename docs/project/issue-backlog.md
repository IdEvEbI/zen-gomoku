# Issue 清单与开发路线（Backlog）

> **产品决策**：[product-vision.md](../design/product-vision.md)（2026-08-07）。  
> **棋力**：[strength-roadmap.md](../design/strength-roadmap.md)。  
> **内容**：[content-sources.md](../design/content-sources.md)。

## 文档说明

- 本文是「计划创建 / 已创建 GitHub Issue」的待办池。
- Backlog 内 **§编号** 与 GitHub Issue **#编号** 不必一一对应；PR 请写实际 `#n`。
- **当前优先级**：VCF → VCT → 学堂闯关（#74）→ 打谱+分析（#73）→  
  人设/评测/音频可并行 → 小程序壳 → 人人与段位 → ML 如来。
- **教学规格**：[teaching.md](../design/teaching.md)。

---

## 里程碑总览

| Milestone               | 窗口（约） | 交付                                                 |
| ----------------------- | ---------- | ---------------------------------------------------- |
| **M1 棋力与练习（H5）** | 0～3 月    | VCF/VCT → 学堂闯关 → 打谱分析 → 人设/评测            |
| **M2 小程序壳**         | ~3 月节点  | 微信+手机号登录、人机/打谱、音频、激励视频（插屏关） |
| **M3 人人与段位**       | ~6 月      | 房间+匹配、观战、断线重连、排位段位（好友不计）      |
| **M4 增长与 IP**        | 上线后     | 广告迭代、软著/专利（门禁后）                        |
| **M5 如来与论文**       | 产品稳定后 | ONNX + 如来佛；论文（不赶工）                        |

历史 Milestone（v0.1～v0.3 基础对局/棋谱/AI）已在 `develop` 交付，  
本节不再展开；旧表见 git 历史。

---

## 已关闭 / 已合入（近期）

| GitHub                                                                                                           | 说明                             |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| [#66](https://github.com/IdEvEbI/zen-gomoku/issues/66) / PR [#68](https://github.com/IdEvEbI/zen-gomoku/pull/68) | 唐僧威胁搜索 + 形分 + rootPolicy |
| [#54](https://github.com/IdEvEbI/zen-gomoku/issues/54)                                                           | 中国规则禁手 + 规则切换          |
| [#58](https://github.com/IdEvEbI/zen-gomoku/issues/58)                                                           | 老师棋谱导出                     |
| [#64](https://github.com/IdEvEbI/zen-gomoku/issues/64)                                                           | 活三必应                         |
| [#51](https://github.com/IdEvEbI/zen-gomoku/issues/51)                                                           | 悔棋                             |

开放中的训练仓：[#60](https://github.com/IdEvEbI/zen-gomoku/issues/60)（zen-gomoku-ml）→  
排入 **M5**，不挡 M1。

---

## M1 — 棋力与练习（H5）· 当前主战场

| #    | GitHub                                                 | 标题                         | 描述                                                                                      |
| ---- | ------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------- |
| M1.1 | [#69](https://github.com/IdEvEbI/zen-gomoku/issues/69) | **feat: 完整 VCF 求解器**    | 连续冲四杀/防；根优先；单测 + 回归                                                        |
| M1.2 | [#70](https://github.com/IdEvEbI/zen-gomoku/issues/70) | **feat: VCT 威胁搜索**       | 连续威胁取胜/防守；唐僧默认最强                                                           |
| M1.3 | [#71](https://github.com/IdEvEbI/zen-gomoku/issues/71) | **feat: 四级人设重做**       | 沙=噪声；猪守；悟攻；唐均衡最强                                                           |
| M1.4 | [#72](https://github.com/IdEvEbI/zen-gomoku/issues/72) | **feat: Agent 预留如来佛**   | `rulai` 占位；无模型不可选                                                                |
| M1.5 | [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74) | **feat: 学堂闯关（题包）**   | 规则·死活 + 26 开局 + 分级 VCF/VCT；落子才过；步后一句；提示限次+激励视频；**可先于 #73** |
| M1.6 | [#73](https://github.com/IdEvEbI/zen-gomoku/issues/73) | **feat: 26 开局打谱+分析**   | 照谱落子 + **每步盘面分析**（依赖唐僧 VCF/VCT）；见 teaching.md                           |
| M1.7 | [#75](https://github.com/IdEvEbI/zen-gomoku/issues/75) | **docs/chore: 引擎公开评测** | 唐僧 vs gobang / Rapfi                                                                    |
| M1.8 | [#76](https://github.com/IdEvEbI/zen-gomoku/issues/76) | **feat: 音频（H5）**         | BGM 可关 + 落子音效                                                                       |

---

## M2 — 微信小程序壳（~3 月对外）

| #    | 标题                             | 描述                                                       | 对应       |
| ---- | -------------------------------- | ---------------------------------------------------------- | ---------- |
| M2.1 | **feat: 小程序工程与核心复用**   | 逻辑复用 `src/core` / `src/ai`；视图适配；构建与发布流水线 | F-REQ-011  |
| M2.2 | **feat: 微信登录 + 手机号**      | 无游客；会话与资料存储（云开发或自建）                     | product §2 |
| M2.3 | **feat: 人机 / 打谱 / 练习迁端** | M1 能力在小程序可玩                                        | M1 依赖    |
| M2.4 | **feat: 激励视频广告（可选）**   | 插屏**默认关**；激励换悔棋/皮肤等；可关广告体验开关        | product §2 |
| M2.5 | **chore: 合规文案与隐私**        | 隐私政策、未成年人与广告说明；无集团/学院导流话术          | product §5 |

---

## M3 — 人人在线与段位（~6 月）

| #    | 标题                           | 描述                                                       | 对应       |
| ---- | ------------------------------ | ---------------------------------------------------------- | ---------- |
| M3.1 | **feat: 房间（邀请码）+ 匹配** | 自建 Node 或云开发；状态机清晰                             | product §2 |
| M3.2 | **feat: 观战**                 | 只读同步；延迟与权限                                       | product §2 |
| M3.3 | **feat: 断线重连**             | 短断续局；超时判负规则文档化                               | product §2 |
| M3.4 | **feat: 排位段位系统**         | **仅排位计分**；好友局不计；体感偏象棋段位；公式另开设计页 | product §2 |
| M3.5 | **feat: 禁手设置（产品默认）** | 默认自由；设置开禁手；人机/人人一致                        | product §2 |

---

## M4 — 增长与知识产权

| #    | 标题                      | 描述                                                       | 对应       |
| ---- | ------------------------- | ---------------------------------------------------------- | ---------- |
| M4.1 | **chore: 软著材料**       | **数科院主体门禁通过后**再填报；个人仓库与职务成果口径一致 | product §5 |
| M4.2 | **chore: 专利可行性评估** | 威胁/双规则训练等是否具备权利要求；不硬凑                  | product §5 |
| M4.3 | **feat: 广告与留存迭代**  | 在不影响对局的前提下调激励点；数据复盘                     | product §2 |

---

## M5 — 如来佛与论文（不挡上线）

| #    | GitHub                                                 | 标题                     | 描述                               |
| ---- | ------------------------------------------------------ | ------------------------ | ---------------------------------- |
| M5.1 | [#60](https://github.com/IdEvEbI/zen-gomoku/issues/60) | **chore: zen-gomoku-ml** | 强老师 + 自对弈；已挂 Milestone M5 |
| M5.2 | （待开）                                               | **feat: 如来佛 Agent**   | ONNX + 唐僧搜索                    |
| M5.3 | （待开）                                               | **docs: 论文大纲**       | 数科院第一单位（门禁后）；不赶工   |

---

## 建议 Labels

`engine`（VCF/VCT）、`ai-persona`、`practice`、`miniprogram`、`multiplayer`、  
`rating`、`compliance`、`documentation`、`ml`

---

## 如何开 Issue

1. 从本表复制标题与描述 → GitHub New Issue。
2. Milestone 选 M1～M5（仓库已建）。
3. 开发分支 `feature/...`，PR 写 `Closes #n`。
4. **下一刀建议**：从 [#69](https://github.com/IdEvEbI/zen-gomoku/issues/69) VCF 开工；  
   引擎就绪后优先推进 [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74) 学堂。

---

## 修订记录

| 日期       | 说明                               |
| ---------- | ---------------------------------- |
| （历史）   | v0.1～v0.3 与早期 Backlog          |
| 2026-08-07 | 按产品愿景重排为 M1～M5；棋力优先  |
| 2026-08-07 | 学堂闯关：#74 前置、#73 加盘面分析 |
