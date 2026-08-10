# 棋谱导入工具

> 本地/开发用脚本：从公开习题页拉取 **moves 串** 转成可导入的 `GameRecord` JSON。  
> **不是**题库商用爬虫；批量入库前读 [content-sources.md](../design/content-sources.md) 合规边界。

| 项   | 内容                                           |
| ---- | ---------------------------------------------- |
| 状态 | 已落地（`scripts/import-wuziqi123.ts`）        |
| 命令 | `npm run import:wuziqi123`                     |
| 输出 | 默认 `fixtures/records/wuziqi123-<stamp>.json` |

---

## 1. wuziqi123.com

### 1.1 用途

- 对照公开 VCF/VCT 题难度（学习、验引擎）
- 导出本仓 H5「导入棋谱」可用的 JSON
- 精选后归档到 [`fixtures/records/`](../../fixtures/records/README.md)

### 1.2 用法

```bash
# 从习题页解析 iframe ?moves=
npm run import:wuziqi123 -- --url https://wuziqi123.com/qipu/zhongjiti/129.html

# 直接传 moves 串（可离线）
npm run import:wuziqi123 -- --moves h8h9j10... --out fixtures/records/wuziqi123/zhongjiti-129.json

# 额外写出带站点坐标的对照版
npm run import:wuziqi123 -- --url ... --annotate --title 'VCF取胜百题004'
```

| 参数         | 说明                                                      |
| ------------ | --------------------------------------------------------- |
| `--url`      | 习题页 URL；解析 iframe 中的 `moves=`                     |
| `--moves`    | 站点 moves 串（与 `--url` 二选一；并存时 `--moves` 优先） |
| `--out`      | 输出路径；默认 `fixtures/records/wuziqi123-<时间戳>.json` |
| `--annotate` | 同写 `*.annotated.json`（含 `site` 坐标与来源 meta）      |
| `--title`    | 写入 annotated `meta.title`                               |

### 1.3 坐标映射

与站点 `qipan3/view.html` 的 `unpack` 一致：

| 站点                    | 本仓 `GameRecord` |
| ----------------------- | ----------------- |
| 列 `a`–`o`              | `c = 0..14`       |
| 行 `1`（底）–`15`（顶） | `r = 15 - n`      |

例：站点 `h8` → `{ r: 7, c: 7 }`（天元附近视具体棋盘）。

### 1.4 合规（必读）

| 允许                              | 禁止（默认）           |
| --------------------------------- | ---------------------- |
| 手工导入少量题目做引擎对照 / 自学 | 整站批量爬答案入库商用 |
| 自研求解器生成题与解答            | 未授权转载整本题库正文 |

精选进仓时：在 `fixtures/records/` 注明来源 URL，题目讲解文案自产。

---

## 2. 相关脚本

| 命令                               | 脚本                                  | 说明                                                         |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `npm run import:wuziqi123`         | `scripts/import-wuziqi123.ts`         | 上文                                                         |
| `npm run verify:vct`               | `scripts/verify-vct-puzzles.ts`       | #83 VCT 题集：唐僧预算命中表（`--deep` / `--write-results`） |
| `npm run generate:teacher-records` | `scripts/generate-teacher-records.ts` | 老师棋谱批量导出；产物默认 `data/teacher/`（gitignore）      |

后续若增加其它站点导入器，放在 `scripts/import-*.ts`，并在本页加一节。

---

## 修订记录

| 日期       | 说明                                     |
| ---------- | ---------------------------------------- |
| 2026-08-07 | 初稿：wuziqi123 导入 + fixtures 归档约定 |
