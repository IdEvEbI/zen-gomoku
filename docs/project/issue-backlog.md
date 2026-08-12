# Issue 清单与开发路线（Backlog）

> **产品决策**：[product-vision.md](../design/product-vision.md)（2026-08-07）。  
> **棋力**：[strength-roadmap.md](../design/strength-roadmap.md)。  
> **内容**：[content-sources.md](../design/content-sources.md)。

## 文档说明

- 本文是「计划创建 / 已创建 GitHub Issue」的待办池。
- Backlog 内 **§编号** 与 GitHub Issue **#编号** 不必一一对应；PR 请写实际 `#n`。
- **当前优先级**：~~VCF~~ → ~~VCT（#70）~~ → ~~多威胁必防（#81）~~ → ~~VCT 题集（#83）~~ →  
  ~~VCT 预算（#85）~~ → ~~学堂初级 bench（#87）~~ → ~~真双契约文档（#89）~~ → ~~真双实现（#91）~~ →  
  ~~冲四假 terminal（#93 · G）~~ → ~~多冲四选点（#95 · F）~~ → ~~攻势顺序（#97 · J）~~ →  
  ~~软起手短 VCT（#99 · I）~~ → ~~其余 F（#101）~~ → ~~软威胁抢攻（#103 · K）~~ →  
  ~~L（#105 / PR #106+#110）~~ → ~~M（#107 / PR #108+#109）~~ →  
  ~~双活四软挤（#111 · N）~~ →  
  ~~剩余 F（#115 · 048/058）~~ →  
  ~~门禁 A（#117 · PR #118）~~ →  
  ~~067 续着 VCF（#119 · PR #120）~~ →  
  ~~门禁 A 全表抽检（#121 · PR #122）~~ →  
  ~~门禁 A rem-7（#123 · PR #124）~~ →  
  **中盘无强迫造势（#125 · M1.2v）** →  
  中级/高级题 → 禁手 → 人设 #71 →  
  学堂闯关（#74）→ 打谱+分析（#73）→ 小程序壳 → 人人与段位 → ML 如来。  
  （契约变更文档先行，见 tang-seng §0。）
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
| [#69](https://github.com/IdEvEbI/zen-gomoku/issues/69) / PR [#78](https://github.com/IdEvEbI/zen-gomoku/pull/78) | 完整 VCF 求解器                  |
| [#70](https://github.com/IdEvEbI/zen-gomoku/issues/70) / PR [#80](https://github.com/IdEvEbI/zen-gomoku/pull/80) | VCT 威胁搜索（仅唐僧 · 野心 A）  |
| [#81](https://github.com/IdEvEbI/zen-gomoku/issues/81) / PR [#82](https://github.com/IdEvEbI/zen-gomoku/pull/82) | 多威胁必防 + 强迫着统一择优      |
| [#83](https://github.com/IdEvEbI/zen-gomoku/issues/83) / PR [#84](https://github.com/IdEvEbI/zen-gomoku/pull/84) | VCT 题集验证（野心 A 能力表）    |
| [#85](https://github.com/IdEvEbI/zen-gomoku/issues/85) / PR [#86](https://github.com/IdEvEbI/zen-gomoku/pull/86) | 唐僧 VCT/VCF 预算加深            |
| [#87](https://github.com/IdEvEbI/zen-gomoku/issues/87) / PR [#88](https://github.com/IdEvEbI/zen-gomoku/pull/88) | 学堂初级题 bench + 根 hardening  |
| [#54](https://github.com/IdEvEbI/zen-gomoku/issues/54)                                                           | 中国规则禁手 + 规则切换          |
| [#58](https://github.com/IdEvEbI/zen-gomoku/issues/58)                                                           | 老师棋谱导出                     |
| [#64](https://github.com/IdEvEbI/zen-gomoku/issues/64)                                                           | 活三必应                         |
| [#51](https://github.com/IdEvEbI/zen-gomoku/issues/51)                                                           | 悔棋                             |

开放中的训练仓：[#60](https://github.com/IdEvEbI/zen-gomoku/issues/60)（zen-gomoku-ml）→  
排入 **M5**，不挡 M1。

---

## M1 — 棋力与练习（H5）· 当前主战场

| #     | GitHub                                                   | 标题                               | 描述                                                                                                                                         |
| ----- | -------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M1.1  | [#69](https://github.com/IdEvEbI/zen-gomoku/issues/69)   | **feat: 完整 VCF 求解器**          | ✅ 已合入 PR [#78](https://github.com/IdEvEbI/zen-gomoku/pull/78)；见 [vcf.md](../design/vcf.md)                                             |
| M1.2  | [#70](https://github.com/IdEvEbI/zen-gomoku/issues/70)   | **feat: VCT 威胁搜索**             | ✅ 已合入 PR [#80](https://github.com/IdEvEbI/zen-gomoku/pull/80)；见 [vct.md](../design/vct.md)                                             |
| M1.2b | [#81](https://github.com/IdEvEbI/zen-gomoku/issues/81)   | **feat: 多威胁必防**               | ✅ 已合入 PR [#82](https://github.com/IdEvEbI/zen-gomoku/pull/82)                                                                            |
| M1.2c | [#83](https://github.com/IdEvEbI/zen-gomoku/issues/83)   | **test: VCT 题集验证**             | ✅ 已合入 PR [#84](https://github.com/IdEvEbI/zen-gomoku/pull/84)                                                                            |
| M1.2d | [#85](https://github.com/IdEvEbI/zen-gomoku/issues/85)   | **feat: VCT 预算加深**             | ✅ 已合入 PR [#86](https://github.com/IdEvEbI/zen-gomoku/pull/86)                                                                            |
| M1.2e | [#87](https://github.com/IdEvEbI/zen-gomoku/issues/87)   | **feat: 学堂初级题 bench**         | ✅ 已合入 PR [#88](https://github.com/IdEvEbI/zen-gomoku/pull/88)；假叉/顺序/真双另开刀                                                      |
| M1.2f | [#89](https://github.com/IdEvEbI/zen-gomoku/issues/89)   | **docs: 根真双契约**               | ✅ 已合入 PR [#90](https://github.com/IdEvEbI/zen-gomoku/pull/90)                                                                            |
| M1.2g | [#91](https://github.com/IdEvEbI/zen-gomoku/issues/91)   | **fix: 根真双契约收紧**            | ✅ 已合入 PR [#92](https://github.com/IdEvEbI/zen-gomoku/pull/92)                                                                            |
| M1.2h | [#93](https://github.com/IdEvEbI/zen-gomoku/issues/93)   | **fix: 冲四假 terminal（G）**      | ✅ 已合入 PR [#94](https://github.com/IdEvEbI/zen-gomoku/pull/94)                                                                            |
| M1.2i | [#95](https://github.com/IdEvEbI/zen-gomoku/issues/95)   | **fix: 多冲四/VCT 选错点（F）**    | ✅ 已合入 PR [#96](https://github.com/IdEvEbI/zen-gomoku/pull/96)；046 `j7`；其余 F 另开                                                     |
| M1.2j | [#97](https://github.com/IdEvEbI/zen-gomoku/issues/97)   | **fix: 攻势顺序 / 多解择优（J）**  | ✅ 已合入 PR [#98](https://github.com/IdEvEbI/zen-gomoku/pull/98)；071/080/074                                                               |
| M1.2k | [#99](https://github.com/IdEvEbI/zen-gomoku/issues/99)   | **fix: 软起手短 VCT 认序（I）**    | ✅ 已合入 PR [#100](https://github.com/IdEvEbI/zen-gomoku/pull/100)；072/075/077/078/068                                                     |
| M1.2l | [#101](https://github.com/IdEvEbI/zen-gomoku/issues/101) | **fix: 其余多冲四选点（F 续）**    | ✅ 已合入 PR [#102](https://github.com/IdEvEbI/zen-gomoku/pull/102)；060/070；048/058 仍待                                                   |
| M1.2m | [#103](https://github.com/IdEvEbI/zen-gomoku/issues/103) | **fix: 软威胁逼应抢攻（K）**       | ✅ 已合入 PR [#104](https://github.com/IdEvEbI/zen-gomoku/pull/104)；soft-squeeze #14 `c7`                                                   |
| M1.2n | [#105](https://github.com/IdEvEbI/zen-gomoku/issues/105) | **fix: 先破对方短杀（L）**         | ✅ 契约 [#106](https://github.com/IdEvEbI/zen-gomoku/pull/106)；实现 [#110](https://github.com/IdEvEbI/zen-gomoku/pull/110)                  |
| M1.2o | [#107](https://github.com/IdEvEbI/zen-gomoku/issues/107) | **fix: 软叉丛关键点（M）**         | ✅ 合入 PR [#108](https://github.com/IdEvEbI/zen-gomoku/pull/108)/[#109](https://github.com/IdEvEbI/zen-gomoku/pull/109)；`forkMultiOfCount` |
| M1.2p | [#111](https://github.com/IdEvEbI/zen-gomoku/issues/111) | **fix: 双活四软挤抢先手（N）**     | ✅ 契约 [#113](https://github.com/IdEvEbI/zen-gomoku/pull/113)；实现 [#114](https://github.com/IdEvEbI/zen-gomoku/pull/114)（#6 `h10`/`f8`） |
| M1.2q | [#115](https://github.com/IdEvEbI/zen-gomoku/issues/115) | **fix: 剩余 F + 门禁 A**           | ✅ [#116](https://github.com/IdEvEbI/zen-gomoku/pull/116)；048 `j4` / 058 `f6`\|`g6`                                                         |
| M1.2r | [#117](https://github.com/IdEvEbI/zen-gomoku/issues/117) | **fix: 门禁 A（050/057/064/067）** | ✅ [#118](https://github.com/IdEvEbI/zen-gomoku/pull/118)；050 `i6` / 057 `g8` / 064 `j7` / 067 `j8`；midgame 软挤谱                         |
| M1.2s | [#119](https://github.com/IdEvEbI/zen-gomoku/issues/119) | **fix: 067 续着冲四/VCF 优先**     | ✅ [#120](https://github.com/IdEvEbI/zen-gomoku/pull/120)→#118；`h10(k7)` 后 `f6` > `f8`                                                     |
| M1.2t | [#121](https://github.com/IdEvEbI/zen-gomoku/issues/121) | **test: 门禁 A 全表抽检**          | ✅ [#122](https://github.com/IdEvEbI/zen-gomoku/pull/122)；期望表+`audit:academy-first`                                                      |
| M1.2u | [#123](https://github.com/IdEvEbI/zen-gomoku/issues/123) | **fix: 门禁 A 剩余 7 题首着**      | ✅ [#124](https://github.com/IdEvEbI/zen-gomoku/pull/124)；**55/55**；含 059 `g11`>`i5`                                                      |
| M1.2v | [#125](https://github.com/IdEvEbI/zen-gomoku/issues/125) | **fix: 中盘无强迫造势**            | **进行中**；模式 O：无叉/无活四时节奏冲四可抢软挡；#28 → `j9`/`k9`                                                                           |
| M1.3  | [#71](https://github.com/IdEvEbI/zen-gomoku/issues/71)   | **feat: 四级人设重做**             | 唐僧定型后：沙=噪声；猪守；悟攻；唐均衡最强                                                                                                  |
| M1.4  | [#72](https://github.com/IdEvEbI/zen-gomoku/issues/72)   | **feat: Agent 预留如来佛**         | `rulai` 占位；无模型不可选                                                                                                                   |
| M1.5  | [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74)   | **feat: 学堂闯关（题包）**         | 规则·死活 + 26 开局 + 分级 VCF/VCT；落子才过；步后一句；提示限次+激励视频；**可先于 #73**                                                    |
| M1.6  | [#73](https://github.com/IdEvEbI/zen-gomoku/issues/73)   | **feat: 26 开局打谱+分析**         | 照谱落子 + **每步盘面分析**（依赖唐僧 VCF/VCT）；见 teaching.md                                                                              |
| M1.7  | [#75](https://github.com/IdEvEbI/zen-gomoku/issues/75)   | **docs/chore: 引擎公开评测**       | 唐僧 vs gobang / Rapfi                                                                                                                       |
| M1.8  | [#76](https://github.com/IdEvEbI/zen-gomoku/issues/76)   | **feat: 音频（H5）**               | BGM 可关 + 落子音效                                                                                                                          |

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
4. **下一刀建议**：[\#125](https://github.com/IdEvEbI/zen-gomoku/issues/125) 中盘无强迫造势（M1.2v）；  
   契约先行 → 锁参考谱关键手；门禁 A 已 55/55；其后中级/高级 → [#74](https://github.com/IdEvEbI/zen-gomoku/issues/74)。

---

## 修订记录

| 日期       | 说明                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| （历史）   | v0.1～v0.3 与早期 Backlog                                                                                                                                 |
| 2026-08-07 | 按产品愿景重排为 M1～M5；棋力优先                                                                                                                         |
| 2026-08-07 | 学堂闯关：#74 前置、#73 加盘面分析                                                                                                                        |
| 2026-08-07 | #69 关闭；下一刀 #70；链 [vct.md](../design/vct.md)（仅唐僧 / 野心 A）                                                                                    |
| 2026-08-10 | #70/#81 合入；开 [#83](https://github.com/IdEvEbI/zen-gomoku/issues/83) VCT 题集验证为下一刀                                                              |
| 2026-08-10 | #83 合入；开 [#85](https://github.com/IdEvEbI/zen-gomoku/issues/85) VCT 预算加深                                                                          |
| 2026-08-10 | 开 [#87](https://github.com/IdEvEbI/zen-gomoku/issues/87) 学堂初级题 bench + 根策略 hardening                                                             |
| 2026-08-11 | #85/#87 合入；下一刀 M1.2f 真双契约；#74/#71 后移至 beginner 门禁后                                                                                       |
| 2026-08-11 | #89 文档合入；开 [#91](https://github.com/IdEvEbI/zen-gomoku/issues/91) 真双实现                                                                          |
| 2026-08-11 | #103/#104 合入；开 [#105](https://github.com/IdEvEbI/zen-gomoku/issues/105) L、[#107](https://github.com/IdEvEbI/zen-gomoku/issues/107) M；实战优先 M     |
| 2026-08-11 | #105 契约合入 PR [#106](https://github.com/IdEvEbI/zen-gomoku/pull/106)；下一刀 [#107](https://github.com/IdEvEbI/zen-gomoku/issues/107) M                |
| 2026-08-11 | #107 契约合入 PR [#108](https://github.com/IdEvEbI/zen-gomoku/pull/108)；实现 forkMultiOfCount（#10 → `j8`）                                              |
| 2026-08-11 | #107 实现合入 PR [#109](https://github.com/IdEvEbI/zen-gomoku/pull/109)；下一刀 [#105](https://github.com/IdEvEbI/zen-gomoku/issues/105) L 实现           |
| 2026-08-11 | #105 实现合入 PR [#110](https://github.com/IdEvEbI/zen-gomoku/pull/110)；开 [#111](https://github.com/IdEvEbI/zen-gomoku/issues/111) 模式 N（双活四软挤） |
| 2026-08-11 | #112 playtest 入库；模式 N 契约：白 #6 → `h10` / `f8`；下一刀实现                                                                                         |
| 2026-08-11 | #113 契约合入；下一刀 [#111](https://github.com/IdEvEbI/zen-gomoku/issues/111) N 实现；入库 `of-counter-snuff` 参考谱                                     |
| 2026-08-12 | #111 实现合入 PR [#114](https://github.com/IdEvEbI/zen-gomoku/pull/114)；开 [#115](https://github.com/IdEvEbI/zen-gomoku/issues/115) 剩余 F（048/058）    |
| 2026-08-12 | #115：强迫残留加延期四三 / 对称干净对 / 单叉双苗；048 `j4`、058 `f6`\|`g6`                                                                                |
| 2026-08-12 | #115 合入 [#116](https://github.com/IdEvEbI/zen-gomoku/pull/116)；开 [#117](https://github.com/IdEvEbI/zen-gomoku/issues/117) 门禁 A；入库 midgame 软挤谱 |
| 2026-08-12 | #117：认序加消叉双苗 / 贴叉双苗；050/057 锁；064 `j7`、067 `j8`                                                                                           |
| 2026-08-12 | #121 抽检 48/55；开 [#123](https://github.com/IdEvEbI/zen-gomoku/issues/123) rem-7；下一刀中盘无强迫造势（M1.2v）                                         |
| 2026-08-12 | #121/#123 合入 [#122](https://github.com/IdEvEbI/zen-gomoku/pull/122)/[#124](https://github.com/IdEvEbI/zen-gomoku/pull/124)；门禁 A 55/55；下一刀 M1.2v  |
| 2026-08-12 | 开 [#125](https://github.com/IdEvEbI/zen-gomoku/issues/125) 中盘无强迫造势（M1.2v）；分支 `feature/midgame-soft-squeeze`                                  |
