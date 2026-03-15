# Feature 开发与 PR 合并后流程

本文档约定「PR 合并后」与「开始新 Issue」的标准步骤，保证每次操作一致。

## PR 合并后的标准步骤

当你在 GitHub 上把某个 feature 分支合并进 `develop` 后，在本地依次执行：

1. **切换到 develop 并拉取**
   - `git checkout develop`
   - `git pull origin develop`

2. **确认与已合并分支一致后删除本地 feature 分支**
   - 对比 `develop` 与刚合并的 feature 分支（例如 `git log develop..feature/xxx` 应为空）。
   - 若一致：`git branch -d feature/<分支名>`（例如 `feature/game-store`）。

3. **按 Backlog 开下一个 Issue 的分支**
   - 打开 `docs/project/issue-backlog.md`，按顺序确定下一个 Issue（如 Issue 5、Issue 6…）。
   - 新建并切换分支：`git checkout -b feature/<新分支名>`（分支名可与 Issue 主题对应，如 `feature/check-winner`）。

完成以上三步后，即可在新分支上开始下一项功能的开发。

## 开始新 Issue 开发时

1. **确认当前在正确的 feature 分支**（上一步已创建）。
2. **阅读 Backlog**：在 `docs/project/issue-backlog.md` 中找到当前 Issue 的标题、描述与验收标准。
3. **实现 → 自测 → 单测/构建**：按 Backlog 与架构文档实现，跑 `npm run test`、`npm run build`。
4. **提交与推送**：提交信息建议包含 Issue 编号，例如 `feat: 胜负判定 (Issue 5)`，然后 `git push -u origin feature/<分支名>`。
5. **开 PR**：在 GitHub 上创建 PR，**Base 选 `develop`**，描述中可写 `Closes #<GitHub Issue 编号>`。

## 分支命名建议

| 类型     | 示例                    |
|----------|-------------------------|
| 新功能   | `feature/check-winner`  |
| 文档/修复 | `docs/xxx`、`bugfix/xxx` |

与 Backlog 中的 Issue 顺序保持一致，便于追溯。
