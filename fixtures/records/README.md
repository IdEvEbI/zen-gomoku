# 测试棋谱（fixtures/records）

本目录存放**人工精选**的可导入棋谱 JSON，用于：

- 本地打谱 / 对照公开题难度
- VCF（及后续 VCT）求解器验题
- 教学与引擎回归的种子局面

**不要**把整站爬取结果批量入库；版权与合规见
[docs/design/content-sources.md](../../docs/design/content-sources.md)。

## 目录约定

| 路径         | 用途                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `wuziqi123/` | 从 wuziqi123.com 手工导入的少量对照题（注明来源 URL）                        |
| `vct/`       | VCT 验题清单 `manifest.json` + 跑分结果（#83）                               |
| 本地草稿     | 用 `npm run import:wuziqi123` 默认写到本目录时间戳文件；确认有用后再改名归档 |

导入工具说明：[docs/development/puzzle-import.md](../../docs/development/puzzle-import.md)。  
验题：`npm run verify:vct`（可选 `--deep` / `--write-results`）。

## 当前对照题（zhongjiti · VCF）

| 文件                           | 来源                                                           | 现网 VCF 首着（验证 2026-08-07） |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------- |
| `wuziqi123/zhongjiti-127.json` | [zhongjiti/127](https://wuziqi123.com/qipu/zhongjiti/127.html) | 禁手 **h14**；无禁 **h10**       |
| `wuziqi123/zhongjiti-128.json` | [zhongjiti/128](https://wuziqi123.com/qipu/zhongjiti/128.html) | **f8**（自由/禁手同）            |
| `wuziqi123/zhongjiti-129.json` | [zhongjiti/129](https://wuziqi123.com/qipu/zhongjiti/129.html) | **g13**（自由/禁手同）           |

## VCT 手拣题（gaojiti · #83）

| 文件                         | 来源                                                       | 档位 | 备注                              |
| ---------------------------- | ---------------------------------------------------------- | ---- | --------------------------------- |
| `wuziqi123/gaojiti-210.json` | [gaojiti/210](https://wuziqi123.com/qipu/gaojiti/210.html) | 中   | 初级标题；引擎深搜仍可能未证      |
| `wuziqi123/gaojiti-220.json` | [gaojiti/220](https://wuziqi123.com/qipu/gaojiti/220.html) | 长   | 高级压力样例                      |
| `wuziqi123/gaojiti-221.json` | [gaojiti/221](https://wuziqi123.com/qipu/gaojiti/221.html) | 中   | 深搜参考首着 **f10**              |
| `wuziqi123/gaojiti-222.json` | [gaojiti/222](https://wuziqi123.com/qipu/gaojiti/222.html) | 长   | 深搜参考首着 **h7**；唐僧预期超时 |

完整期望与能力表：[`vct/manifest.json`](./vct/manifest.json)、[`vct/RESULTS.md`](./vct/RESULTS.md)。

同名前缀的 `.annotated.json` / `*-solution.json` / `*-guide.json` 为学习对照，非 CI 必需。

坐标：站点 `a–o` / `1`（底）–`15`（顶）→ 本仓 `c = letter`，`r = 15 - n`。
