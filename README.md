# zen-gomoku

五子棋 H5 游戏 — Vue 3 + TypeScript + Vite，支持 PC / 手机 / 微信浏览器。

## 技术栈

- Vue 3、TypeScript、Vite 7
- Pinia、Tailwind CSS v4、clsx

## 开发

```bash
npm install
npm run dev
```

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化源码 |

## 分支与协作

- **分支策略**：[docs/development/branch-strategy.md](docs/development/branch-strategy.md)
- **参与开发**（提交规范、PR 流程）：[CONTRIBUTING.md](CONTRIBUTING.md)

## CI

Push / PR 到 `main` 或 `develop` 会触发 GitHub Actions：`npm ci` → `npm run lint` → `npm run build`。

## 许可证

MIT
