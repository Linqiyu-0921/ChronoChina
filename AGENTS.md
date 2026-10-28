# 同岁山河 · ChronoChina 项目协作规则

中国历史时序图谱：多政权并行年表与纪年研究工具。通用规则见工作区根 `AGENTS.md`，本文件只记项目特有约定。

## 定位边界

- 这是**纪年工作台**，不是地图集（地图需求深链江山时序，不自建）、不是内容展示站。
- 数据准确性 > 功能数量。宁可范围小，不可纪年错。

## 硬性数据规则

1. **改任何 `data/*.json` 后必须跑 `npm run validate`**（`npm run build` 会自动跑），校验不过不许构建。
2. 内部时间统一**天文纪年整数**（前 1 = 0，前 2 = −1），禁止使用 JS `Date` 表示历史年份。
3. 干支只由 `src/lib/time.ts` 的算法生成，**不在数据中存干支**；新加锚点到 `scripts/validate.mjs` 的 `GANZHI_ANCHORS` 做交叉核对。
4. 在位（reign）与年号（era）分离建模；跨君主沿用年号必须 `crossReign: true` 并列出全部 reignIds。
5. 同年改元允许 era 相接（`next.start === prev.end`），但必须有 `startMonth`、`endNote` 或 `note` 佐证。
6. 学界有异说的条目必须 `disputed: true`（或政权级 `precision: "approx"`）并在 note 里写明异说内容；界面用虚线/徽标呈现。
7. 每条 era / event 必须带 `sources`；新增来源先登记 `sources.json`。维基内容按 CC BY-SA 4.0 署名，事件文字独立改写，不复制原文。
8. 只有年级精度把握时，不填 month；禁止把农历日期自动换算成公历日（P1 接农历库前停留在月级标注）。

## 代码约定

- 技术栈：Vite + React + TypeScript（strict）+ d3-scale；无后端、无数据库，数据是静态 JSON。
- 时间轴为纵向 HTML/CSS 画布（`src/views/Timeline.tsx`）；改渲染前先理解 zoom/pan 的 scale 映射与 wheel 非被动监听的写法。
- 新增视图沿用 `src/views/`，共用查询逻辑放 `src/lib/`；纸墨学术风变量在 `styles.css` 的 `:root`。

## 工作流

- 小步修改：数据 → `validate` → 页面核对 → 再提交。
- 扩朝代时按「一个政权一批」录入，先补 `polities`/`reigns` 再补 `eras`，最后 events。
- 路线图与阶段划分见 `README.md`，重大方向调整先更新 README 再动代码。
