# Academy · Beginner

Hand-picked beginner puzzles for engine checks and the future Wuzi Academy.  
Sources: [wuziqi123 初级题](https://wuziqi123.com/qipu/chujiti/)；compliance: [content-sources.md](../../../docs/design/content-sources.md).

**引擎能解 / 不能解：见 [RESULTS.md](./RESULTS.md)**（题集测完前以记表为主，暂不改代码）。

| 系列         | ID 范围 | 题量 | 唐僧命中（约）                        |
| ------------ | ------- | ---- | ------------------------------------- |
| 入门题四四   | 031–050 | 20   | 人机：**17/20**（046/048/050 未命中） |
| 入门题四三   | 051–070 | 20   | 人机：**10/20**                       |
| 入门题双活三 | 071–085 | 15   | 修 B 后回升中；顺序敏感题见 RESULTS   |

Import: `npm run import:wuziqi123 -- --url … --out fixtures/records/academy/beginner/NNN.json --title '…'`  
Batch: `npx tsx scripts/batch-academy-beginner.ts`
