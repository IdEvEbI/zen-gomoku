# 分支策略 (Branch Strategy)

本项目采用基于 Git Flow 的简化分支模型，便于协作与发布。

## 常设分支

| 分支 | 说明 | 保护 |
| --- | --- | --- |
| `main` | 生产就绪代码，对应线上/发布版本 | 建议保护：仅通过 PR 合并，需 CI 通过 |
| `develop` | 集成开发分支，功能合并后的稳定开发线 | 建议保护：仅通过 PR 合并 |

## 临时分支（按需创建，合并后删除）

| 类型 | 命名规范 | 从何拉取 | 合并到 |
| --- | --- | --- | --- |
| 功能 | `feature/<简短描述>` 例：`feature/canvas-board` | `develop` | `develop` |
| 修复 | `bugfix/<简短描述>` 例：`bugfix/win-check` | `develop` | `develop` |
| 热修 | `hotfix/<简短描述>` 例：`hotfix/touch-event` | `main` | `main` 并同步回 `develop` |
| 发布 | `release/<版本号>` 例：`release/v0.1.0` | `develop` | `main` 和 `develop` |

## 工作流简述

1. 从 `develop` 拉取 `feature/xxx`，开发完成后提 PR 合并回 `develop`。
2. 发布时从 `develop` 拉取 `release/v0.x.x`，测试通过后合并到 `main` 并打 tag，再合并回 `develop`。
3. 线上紧急问题从 `main` 拉取 `hotfix/xxx`，修完后合并回 `main`，并合并回 `develop` 保持同步。

## 单分支简化模式（可选）

若团队较小，可仅保留 `main`，所有开发在 `feature/*` 分支进行，通过 PR 合并到 `main`。此时可不使用 `develop`。

## GitHub 分支保护建议

在仓库 **Settings → Branches** 中建议配置：

- **main**：Require a pull request before merging、Require status checks to pass (CI)、Do not allow bypassing
- **develop**（若使用）：Require a pull request、Require status checks to pass
