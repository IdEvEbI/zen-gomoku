# 测试棋谱（fixtures/records）

本目录存放**人工精选**的可导入棋谱 JSON，用于：

- 本地打谱 / 对照公开题难度
- VCF（及后续 VCT）求解器验题
- 教学与引擎回归的种子局面

**不要**把整站爬取结果批量入库；版权与合规见
[docs/design/content-sources.md](../../docs/design/content-sources.md)。

## 目录约定

| 路径                | 用途                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `wuziqi123/`        | 从 wuziqi123.com 手工导入的少量对照题（注明来源 URL）                        |
| `academy/beginner/` | 五子学堂 · 初级题；能力表见 [`RESULTS.md`](./academy/beginner/RESULTS.md)    |
| `vct/`              | VCT 验题清单 `manifest.json` + 跑分结果（#83）                               |
| 本地草稿            | 用 `npm run import:wuziqi123` 默认写到本目录时间戳文件；确认有用后再改名归档 |

导入工具说明：[docs/development/puzzle-import.md](../../docs/development/puzzle-import.md)。  
验题：`npm run verify:vct`（可选 `--deep` / `--write-results`）。

## 当前对照题（zhongjiti · VCF）

| 文件                           | 来源                                                           | 现网 VCF 首着（验证 2026-08-07） |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------- |
| `wuziqi123/zhongjiti-127.json` | [zhongjiti/127](https://wuziqi123.com/qipu/zhongjiti/127.html) | 禁手 **h14**；无禁 **h10**       |
| `wuziqi123/zhongjiti-128.json` | [zhongjiti/128](https://wuziqi123.com/qipu/zhongjiti/128.html) | **f8**（自由/禁手同）            |
| `wuziqi123/zhongjiti-129.json` | [zhongjiti/129](https://wuziqi123.com/qipu/zhongjiti/129.html) | **g13**（自由/禁手同）           |

**学习谱**：`zhongjiti-128-solution.json` → `f8 (g7) g8 (e8) i8`（已成五）；`zhongjiti-129-solution.json`、`zhongjiti-127-renju-solution.json` 见同目录。

## VCT 手拣题（gaojiti · #83）

| 文件                         | 来源                                                       | 档位 | 备注                                  |
| ---------------------------- | ---------------------------------------------------------- | ---- | ------------------------------------- |
| `wuziqi123/gaojiti-210.json` | [gaojiti/210](https://wuziqi123.com/qipu/gaojiti/210.html) | 中   | **白先行**；引擎首着 **g6**           |
| `wuziqi123/gaojiti-220.json` | [gaojiti/220](https://wuziqi123.com/qipu/gaojiti/220.html) | 长   | 高级压力样例                          |
| `wuziqi123/gaojiti-221.json` | [gaojiti/221](https://wuziqi123.com/qipu/gaojiti/221.html) | 中   | 深搜参考首着 **f10**                  |
| `wuziqi123/gaojiti-222.json` | [gaojiti/222](https://wuziqi123.com/qipu/gaojiti/222.html) | 长   | 深搜参考首着 **h7**；唐僧加深后可命中 |

**学习谱**（题面 + 引擎强迫主线前缀，可 H5 导入）：

| 文件                        | 主线摘要（守方在括号内）                                 |
| --------------------------- | -------------------------------------------------------- |
| `gaojiti-210-solution.json` | 人机正解 `g11…d8`（已成五）；根上引擎首着 **g6**         |
| `gaojiti-220-solution.json` | 人机正解 `i10…k2`（已成五）；引擎首着 g9/j6              |
| `gaojiti-221-solution.json` | 人机正解 `i5…e6 (d7) i2`（已成五）；根上引擎首着 **f10** |
| `gaojiti-222-solution.json` | 人机正解 `i7…i6 (i8) i3`（已成五）；引擎首着 **h7**      |

对局 playtest：`playtests/tang-gaojiti-210-2026-08-10-05-17-21.json`、`220-…`、`221-…`、`222-…`；  
实战软逼应：`playtests/tang-soft-squeeze-2026-08-11-06-16-30.json`（黑胜；白硬防未漏、软威胁下只挡不抢）。

生成：`npx tsx scripts/build-gaojiti-study-records.ts`。非站点官方唯一解；`meta.complete=false` 表示尚未收到成五。

完整期望与能力表：[`vct/manifest.json`](./vct/manifest.json)、[`vct/RESULTS.md`](./vct/RESULTS.md)。

同名前缀的 `.annotated.json` / `*-solution.json` / `*-guide.json` 为学习对照，非 CI 必需。

坐标：站点 `a–o` / `1`（底）–`15`（顶）→ 本仓 `c = letter`，`r = 15 - n`。
