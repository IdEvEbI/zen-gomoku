# 项目文档索引

本目录存放开发规范与项目相关文档，按子目录与命名规则组织，便于查找和扩展。

## 命名与结构约定

- **文件名**：统一使用 **kebab-case**（小写 + 连字符），  
  例如 `branch-strategy.md`、`requirements.md`。便于 URL、链接和跨平台一致性。
- **目录**：
  - **development/**：开发流程、规范、工具说明（分支策略、编码约定等）。
  - **project/**：产品与项目文档（需求、设计、会议纪要等）。

## 目录结构

```txt
docs/
├── README.md
├── development/
│   ├── branch-strategy.md
│   └── feature-workflow.md
├── project/
│   ├── issue-backlog.md
│   ├── requirements.md
│   └── design.md
├── requirements/
│   └── functional-spec.md
└── design/
    ├── product-vision.md      # 产品终态与里程碑（决策）
    ├── teaching.md            # 新手学堂（闯关；双规则）
    ├── content-sources.md     # 26 开局 / VCT·VCF 内容来源
    ├── technical-architecture.md
    ├── ai-agents.md
    ├── strength-roadmap.md
    ├── tang-seng-strength.md
    ├── alphazero-lite.md
    └── forbidden-moves.md
```

## 开发文档 (development/)

| 文档                                                   | 说明                               |
| ------------------------------------------------------ | ---------------------------------- |
| [branch-strategy.md](development/branch-strategy.md)   | 分支策略与 Git 工作流              |
| [feature-workflow.md](development/feature-workflow.md) | PR 合并后与开始新 Issue 的标准步骤 |

## 项目文档 (project/)

| 文档                                         | 说明                                      |
| -------------------------------------------- | ----------------------------------------- |
| [issue-backlog.md](project/issue-backlog.md) | Issue 清单与开发路线                      |
| [requirements.md](project/requirements.md)   | 需求入口（指向 functional-spec）          |
| [design.md](project/design.md)               | 设计入口（指向 architecture / ai-agents） |

## 需求规格 (requirements/)

| 文档                                                  | 说明           |
| ----------------------------------------------------- | -------------- |
| [functional-spec.md](requirements/functional-spec.md) | 功能规格说明书 |

## 设计与架构 (design/)

| 文档                                                          | 说明                                       |
| ------------------------------------------------------------- | ------------------------------------------ |
| [product-vision.md](design/product-vision.md)                 | **产品愿景与 M1～M5 里程碑（2026-08-07）** |
| [teaching.md](design/teaching.md)                             | 新手学堂：闯关、提示广告、#73/#74 分工     |
| [content-sources.md](design/content-sources.md)               | 26 开局与 VCT/VCF 练习内容来源与合规       |
| [technical-architecture.md](design/technical-architecture.md) | 技术架构设计                               |
| [ai-agents.md](design/ai-agents.md)                           | AI 算法与四级难度（实现对照）              |
| [strength-roadmap.md](design/strength-roadmap.md)             | 棋力对标、四级人设重做、VCF/VCT 优先       |
| [tang-seng-strength.md](design/tang-seng-strength.md)         | 唐僧威胁搜索 as-built                      |
| [alphazero-lite.md](design/alphazero-lite.md)                 | 自由/禁手双模型训练路线（M5）              |
| [forbidden-moves.md](design/forbidden-moves.md)               | 中国规则禁手规格                           |

新文档请按上述目录放入对应子目录，并保持 kebab-case 命名；  
新增后可在本 README 的表格中加一行链接。
