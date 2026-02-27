# 参与开发 (Contributing)

## 开发前

1. Fork 本仓库（若你无直接推送权限）。
2. Clone 到本地，添加 upstream：`git remote add upstream <原仓库 URL>`。
3. 阅读 [分支策略](docs/development/branch-strategy.md)，从 `develop`（或 `main`）拉取新分支。

## 开发流程

1. **拉取最新**：`git fetch upstream && git checkout develop && git merge upstream/develop`。
2. **创建分支**：`git checkout -b feature/your-feature-name`（命名见分支策略）。
3. **开发与自测**：本地 `npm run dev`、`npm run build`、`npm run lint` 通过。
4. **提交**：使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式，例如：
   - `feat: 添加棋盘 Canvas 渲染`
   - `fix: 修复触摸落子偏移`
   - `chore: 升级依赖`
5. **推送**：`git push origin feature/your-feature-name`。
6. **提 PR**：在 GitHub 上创建 Pull Request，目标分支为 `develop`（或 `main`），填写 PR 模板。
7. **Code Review**：根据反馈修改，确保 CI 通过后合并。

## 提交信息规范 (Conventional Commits)

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档
- `style:` 格式（不影响逻辑）
- `refactor:` 重构
- `perf:` 性能
- `test:` 测试
- `chore:` 构建/工具/依赖

示例：`feat(game): 实现五子连珠胜负判定`

## 代码规范

- 通过 ESLint：`npm run lint`。
- 格式化：`npm run format`（提交前建议执行）。
- 使用项目内配置的 EditorConfig，保持缩进与换行一致。

## CI

每次推送到 PR 或目标分支会触发 GitHub Actions：安装依赖、lint、构建。合并前请确保 CI 通过。
