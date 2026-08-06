# 项目文档索引

本目录存放开发规范与项目相关文档，按子目录与命名规则组织，便于查找和扩展。

## 命名与结构约定

- **文件名**：统一使用 **kebab-case**（小写 + 连字符），例如 `branch-strategy.md`、`requirements.md`。便于 URL、链接和跨平台一致性。
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
│   ├── requirements.md   # 指向正式规格的入口
│   └── design.md         # 指向正式设计的入口
├── requirements/
│   └── functional-spec.md
└── design/
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

| 文档                                                          | 说明                                   |
| ------------------------------------------------------------- | -------------------------------------- |
| [technical-architecture.md](design/technical-architecture.md) | 技术架构设计                           |
| [ai-agents.md](design/ai-agents.md)                           | AI 算法与四级难度                      |
| [strength-roadmap.md](design/strength-roadmap.md)             | 棋力对标与三层「最强」策略（决策记录） |
| [tang-seng-strength.md](design/tang-seng-strength.md)         | 唐僧棋力增强（威胁搜索；Cursor 交接）  |
| [alphazero-lite.md](design/alphazero-lite.md)                 | 自由/禁手双模型训练路线（已确认设计）  |
| [forbidden-moves.md](design/forbidden-moves.md)               | 中国规则禁手规格（实现对照）           |

新文档请按上述目录放入对应子目录，并保持 kebab-case 命名；新增后可在本 README 的表格中加一行链接。
