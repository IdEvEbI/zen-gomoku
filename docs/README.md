# 项目文档索引

本目录存放开发规范与项目相关文档，按子目录与命名规则组织，便于查找和扩展。

## 命名与结构约定

- **文件名**：统一使用 **kebab-case**（小写 + 连字符），例如 `branch-strategy.md`、`requirements.md`。便于 URL、链接和跨平台一致性。
- **目录**：
  - **development/**：开发流程、规范、工具说明（分支策略、编码约定等）。
  - **project/**：产品与项目文档（需求、设计、会议纪要等）。

## 目录结构

```text
docs/
├── README.md           # 本索引与约定说明
├── development/        # 开发相关
│   └── branch-strategy.md
├── project/            # 项目相关（需求、设计等）
│   ├── issue-backlog.md
│   └── doc-review.md   # 文档评审与补充建议
├── requirements/       # 需求规格
│   └── functional-spec.md
└── design/             # 设计与架构
    └── technical-architecture.md
```

## 开发文档 (development/)

| 文档 | 说明 |
| --- | --- |
| [branch-strategy.md](development/branch-strategy.md) | 分支策略与 Git 工作流 |

## 项目文档 (project/)

| 文档 | 说明 |
| --- | --- |
| [issue-backlog.md](project/issue-backlog.md) | Issue 清单与开发路线（示例标题与描述） |
| [doc-review.md](project/doc-review.md) | 文档评审与补充建议（2026-03-02） |

## 需求规格 (requirements/)

| 文档 | 说明 |
| --- | --- |
| [functional-spec.md](requirements/functional-spec.md) | 功能规格说明书 |

## 设计与架构 (design/)

| 文档 | 说明 |
| --- | --- |
| [technical-architecture.md](design/technical-architecture.md) | 技术架构设计 |

新文档请按上述目录放入对应子目录，并保持 kebab-case 命名；新增后可在本 README 的表格中加一行链接。
