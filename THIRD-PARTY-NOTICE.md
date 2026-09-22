# 第三方代码与文档归属

## 来源

- 仓库：AICO-PPT（gitcode.com/AICO-Ascend/AICO-PPT）
- 快照 commit：`4b5fcdfef6e518677fcbe1764a11e5b0c0c6a8dd`（2026-09-10）
- 抓取日期：2026-09-22（git clone）

## 许可

上游 `scripts/`、`references/`、`SKILL.md` 等原创代码与文档以 MIT 许可发布：

> Copyright (c) 2026 AICO-Ascend and aico-ppt contributors
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction...
>（完整文本见上游仓库 LICENSE）

上游明确**不在** MIT 范围内的内容，本仓未纳入：`assets/huawei-refs/`（华为官方版式/封面/logo/品牌色，版权归华为）、`.agents/skills/pdf/`（Anthropic 官方 skill）。

## 本仓 vendor 清单（均为上游原样拷贝，未改动）

| 本仓路径 | 上游路径 | 用途 |
|---|---|---|
| `scripts/html2pptx/`（全部，含 `template/` PPTX 母版 XML 及其自带的 LICENSE.python-pptx / SOURCE.txt） | `scripts/html2pptx/` | HTML → PPTX 导出管线（image / editable 双模式） |
| `scripts/verify/load-playwright.mjs` | `scripts/verify/load-playwright.mjs` | playwright-core 加载器（vendor 脚本共用） |
| `scripts/verify/desktop-renderer.mjs` | `scripts/verify/desktop-renderer.mjs` | 上游桌面宿主渲染连接（本仓环境不会触发，保 load-playwright 引用完整） |
| `scripts/verify/measure_overflow.mjs` | `scripts/verify/measure_overflow.mjs` | 逐页溢出检测（playwright 真实渲染量 scrollHeight） |
| `scripts/verify/shot.mjs` | `scripts/verify/shot.mjs` | 单页 1920×1080 截图 |
| `docs/aico-ppt-references/*.md`（9 篇） | `references/*.md` | 方法论参考（工作流/设计系统/华为风格分析/页型目录/动画/配图/骨架/品牌/编辑指南） |

## 注意

- vendor 脚本按上游 DOM 结构（`.stage .slide-canvas` / `section[data-label]` / layer 协议）工作，对本技能产出的 `.slide` 结构需先适配选择器（见 README 设计决策）。
- 后续对 vendor 文件的修改属本仓内容；追溯原始版本用上表对应上游路径 + 快照 commit。
- 上游完整仓库可随时从 gitcode 重新克隆对照。
