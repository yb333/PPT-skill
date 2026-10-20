---
name: deck-studio
description: HTML 演示技能 deck-studio：用户要做 PPT、slides、汇报、洞察报告或任何可视化演示时使用。inline SVG 绘制架构图/流程图（禁 emoji/ASCII 图）；机器门禁（溢出/密度检测）、PPTX 一键可编辑导出、全屏放映播放器、章级目录页型、流线动画引擎。
---

# Deck Studio — HTML 演示工作室

前身 frontend-slides 已下线（源仍存于本仓根），本技能是其融合重构后继，现为唯一 PPT/演示技能。独有：**人机协同流程强化**（需求共识/事实整理/规划落盘）、**机器门禁**（溢出检测代替人工清单）、**引擎唯一源**（标记块写入，杜绝手写引擎）、**PPTX 导出**（一键可编辑）、**播放器壳**（全屏放映、流线动画、聚光灯、目录页）。

## 核心理念

1. **人机协同共建** — 结构与动画与用户一起讨论产出，不是套模板填内容。大纲（Phase 1）与 Design Spec（Phase 2）是硬确认闸门。
2. **零依赖单文件** — 单 HTML 内联 CSS/JS，无构建工具，离线可拷走。
3. **Show, Don't Tell** — 用户说不清偏好就生成预览让他反应，不给抽象选项。
4. **表达力优先** — 动画/演示光标是 HTML deck 对传统 PPT 的核心优势，不为 PPTX 可移植性牺牲；导出时压平为最终态快照（见宪法 3）。
5. **固定画布舞台（不可协商）** — 每页 1920×1080 逻辑画布，舞台缩放适配窗口，零滚动；打开即"一页就是一页"的 PPT 观感；放不下就拆页。

## 三条产品宪法（执行摘要）

1. **色板主权**：蓝色三层 token 体系是默认主题；预设与品牌模板是用户显式选择后的 token 覆盖。规范见 `references/theme.md`。
2. **HTML 唯一事实源**：PPTX 是快照投影、无动画、每页=最终态；单一导出入口，导出后校验页数平价；不承诺 pptx→html 回流。
3. **表达力优先**：动画自由使用，导出负责压平。

## 默认配置

- 尺寸：固定 1920×1080 逻辑画布（舞台 transform 缩放适配窗口，页内一律 px 排版）；主题：亮色白底 + 蓝色系；字体：大字体（正文 20px+、标题 32px+）；布局：少空白、内容充实、工整对齐；输出：单 HTML 文件。
- 交付默认 HTML；用户明确要 .pptx 时才导出（Phase 7）。

## Deck ↔ 工具契约（每个生成的 deck 必须遵守，验证/导出工具按此工作）

1. 页面元素：`<section class="slide" data-label="页面标识">`，置于舞台 `<div class="deck-stage"><div class="deck-fit">` 内。`data-label` 是页的唯一标识（中文短语），工具按它定位页。
2. 画布：`.deck-fit` 固定 1920×1080，JS 缩放适配窗口（引擎由 sync-engine 写入）；页内 px 排版（layout.md 刻度），**禁止** 100vw/100vh、clamp()、IntersectionObserver；根文档零滚动——浏览模式的滚动发生在 `.deck-stage` 容器内。
3. 模式：`body.browse`（默认，无缝长页滚动，reveal 全显）/ `body.presenting`（放映，单页 letterbox，申报动画节拍推进）。不用 IO。
4. 播放器 chrome 单一聚合：左上角 `.deck-bar` 一处容纳 ☰ 目录（开 `.deck-sidebar` 缩略图）/ 页码 / ▶ 放映，**不设** nav dots 等多处页码；全部契约类名：`.deck-stage` / `.deck-fit` / `.deck-bar` / `.deck-menu` / `.deck-sidebar` / `.deck-progress` / `.pres-cursor` / `.pres-cursor-hint` / `.player-hint`——工具截图/测量前会隐藏或静态化它们。
5. 主题色一律走 CSS 变量 token（`references/theme.md`），不写死 hex。

## Phase 0: 模式识别

- **Mode A 新建演示** → Phase 1
- **Mode B 已有 PPTX 转换** → Phase 6
- **Mode C 已有 HTML 演示增强** → 读文件理解结构后按 Phase 5 打磨

## Phase 1: 需求共识与大纲

目标：把一句话需求变成确认过的大纲。**协作深度规范见 `references/process.md`（必读）**——五件事问询（听众/场合时长/目标/素材/品牌交付）、需求共识复述、先整理材料事实、场景适配（授课/汇报/自读三场景的页数节奏与语言风格）、`<deck名>.plan.md` 落盘。

大纲**先分章再排页**（process.md 按章规划）：3–6 章、每章 2–5 页，页挂章下；≥7 页的 deck 第 2 页放目录页（章级条目，可点跳页），条目序号与各页 eyebrow 的 `章.节` 编号一致。

大纲格式（进 plan.md）：每页一行 `| # | label | 这页要说啥（一句话） | 布局 | 配图 |`。label 即 `data-label`。

- ⏸️ **闸门：用户确认大纲后才进 Phase 2**。用户催"直接做"时改为带默认值的一轮快答，不跳过确认。

## Phase 2: Design Spec（内容&视觉细化）

把大纲细化到可一次成型生成：每页的区块占比、SVG 关键参数（viewBox/元素坐标/配色 token）、完整文本（精确到每个 label）、**动画申报**（默认零动画；确需动画处对照 animation.md 机制速查表写明机制+元素坐标+语义理由）。

- ⏸️ **闸门：用户确认 spec 后才进代码生成**。确认重点：SVG 参数合理、文本完整、色彩层正确、动画申报克制。

## Phase 3: 风格选择

默认路径：**蓝色三层主题，不问直接用**（默认场景）。用户想换风格时才走发现流程：问感受（可多选 2 个）→ 生成 3 个风格预览（单页 title slide，`.claude-design/slide-previews/`）→ 用户挑或混搭。12 套预设清单与 token 覆盖格式见 `references/presets.md`。

选了预设 = 显式豁免蓝色约束（宪法 1）；未选 = Phase 5 色彩检查强制蓝色系。用户属于华为云山体系时直接走品牌模板（Phase 4），模板自带 `--ys-*` 主题 token。

## Phase 4: 代码生成

输入：Phase 1 内容 + Phase 2 spec + Phase 3 风格。产出单 HTML 文件，**从模板起步、引擎由工具写入**：

1. **复制模板**：`assets/templates/yunshan.html` 是全页型骨架基准（封面/目录/内容页/卡片网格/表格混排/深蓝金句/结束页 + 引擎标记块占位）。**必须用 `cp` 整文件复制起步，严禁凭记忆重写模板或省略内嵌 base64（封面背景/品牌 logo 是大体积内嵌资产，重写必丢——丢了封面就是白板，e2e 门禁强制封面起/结束页终）**。云山体系直接用；其他品牌删品牌资产、换 token，骨架照用。
2. **填内容**：按 `references/page-types.md` 选型/增删 section（占位说明即"这栏该写什么"）；排版对照 `references/layout.md` 刻度；图表自绘读 `references/svg-diagrams.md`（inline SVG，禁 emoji/ASCII 图）；文案对照 `references/copywriting.md`；封面/结束页只改填写区文字，不重画。
3. **申报动画**：默认零动画；需要时按 `references/animation.md` 机制速查表，在数据区声明 `DECK_AUTO` / `DECK_STEPS` / `DECK_COUNTUP` / `DECK_AMBIENT`（坐标 = 页 svg viewBox 体系）。
4. **写引擎**：不手写引擎——`node <skill>/scripts/sync-engine.mjs <deck.html>` 把 `═══ DECK ENGINE ═══` 标记块写入。唯一源是 `assets/effects/` 五件套，**严禁手改块内代码**。

**必读**：`references/page-types.md`（页型选型）、`references/layout.md`（排版刻度）、`references/player.md`（行为契约与播放器壳 DOM——引擎行为以 assets/effects 唯一源为准）。

**长 deck**：≤10 页一次生成；更长时分段写 section 再合并——`:root` 只留一份、`data-label` 全局唯一、SVG `<defs>` 的 gradient/marker id 不冲突、引擎块最后由 sync-engine 统一写入。

## Phase 5: 迭代打磨（门禁四件套）

每次修改后**必须**按序跑（`<skill>` = `~/.zcode/skills/deck-studio`；退出码非 0 就修，修完重跑；最多迭代 3 轮仍红则带着输出求助用户）：

```bash
node <skill>/scripts/sync-engine.mjs <deck.html> --check    # ① 引擎块与唯一源一致
node <skill>/scripts/verify/measure_overflow.mjs <deck.html> --all   # ② 全页溢出检测
node <skill>/scripts/verify/e2e_check.mjs <deck.html>        # ③ 真实交互全路径（浏览/放映/目录/按键）
node <skill>/scripts/verify/shot.mjs <deck.html> <data-label> /tmp/page.jpg   # ④ 重点页目检
```

人工清单（门禁之外逐项过）：SVG viewBox ≥ 内容最大 y + padding；标签不重叠（相近 y 间隔 ≥14px）；卡片精确包裹内容；中文术语首现附英文括号；默认路径无绿/橙/紫（蓝板宪法）；渐变垂直方向；SVG `font-size="N"` 无 px 后缀；正文字号与单页文字量已由门禁自动检查（HTML ≥14px、SVG 有效 ≥9px、单页 ≤320 字——投影场景按 layout.md 场景分档升档）。完整清单与协作纪律（按页记录修改、逐章引导反馈、结构性意见在初版轮消化）见 `references/process.md`。

## Phase 6: PPTX → HTML 提取（Mode B）

用 `python-pptx` 提取（文本按 shape 遍历、图片导出到 assets/、notes 保留），整理成结构清单**给用户确认**后，走 Phase 3 风格选择 → Phase 4 生成 HTML。保留原 ppt 的全部文本、图片、页序。

## Phase 7: 交付

1. 清理 `.claude-design/slide-previews/` 等临时产物。
2. 交付 HTML（`open <file>.html` 或发文件路径），附导航说明（浏览=滚轮长页滚动、←/→ 页级定位、F 放映（→/单击逐条推进）、P 聚光灯、左上角 ☰ 页面目录；**人手微调=node <skill>/scripts/serve/deck-serve.mjs <deck.html> 后按 E——直接双击打开的 deck 是纯观看，没有编辑器，务必把这条连同命令一起告知用户**）。
3. 用户需要 .pptx 时，deck 内 **⤓ 按钮一键下载可编辑 PPTX**（文字/形状/表格对象可直接编辑；deck-bar 含 #pptxBtn 即有此能力）。导出后自检：pptx 页数 == deck 页数；用 WPS/PowerPoint 打开抽查重点页。

---

## 用户人手微调（deck-serve：浏览器内所见即所得）

交付后的文字/颜色/位置微调，用户可以不经过对话自己动手（win/mac 通用，需 Node ≥18；溢出门禁需 playwright-core + 本机 Chrome/Edge）：

```bash
node <skill>/scripts/serve/deck-serve.mjs <deck.html> [--port 4173]
```

打开打印出的 `http://localhost:4173/?edit=1`（或页内按 E）进入编辑态：**点文字直接改；单击选中、拖拽挪位（靠近同页其他元素的边/中线自动吸附并画参考线）、方向键 1px 精调（Shift=10px，不吸附）；浮动工具条改主题色/字号步进（刻度档）/加粗/对齐；SVG 纯文本 `<text>` 双击可直接改写（含 tspan 的多段定位文本不可改，走对话）；Ctrl+Z 撤销；Ctrl+S 保存**=写回原文件（旧版自动留 `<deck>.bak`）并自动跑门禁——引擎块校验前置拦截（改了禁改区直接拒收），溢出/密度门禁后台跑完经 toast 推送，保存后页面自动刷新。

**分工边界**（对用户说明白）：人手适合改字、换词、调色、挪几像素、改数据区动画参数；**增删页、挪章、画新图、动画序列设计仍走对话**——结构变化牵动目录/eyebrow/页码联动，编辑态不提供入口。编辑器由服务注入，deck 文件保持干净（直接双击打开=纯观看）；svg 内部与引擎标记块在编辑态不可改。人手改完 plan.md 随手同步（process.md 纪律）。

---

## 一键安装（opencode / 内网）

技能本体即安装包：`deck-studio/` 目录整个拷走就能装（研发仓的 docs/tests/dev 件不在目录内，天然不带）。

```bash
node install.mjs             # 全局安装 → ~/.config/opencode/skills/deck-studio
node install.mjs --local     # 项目级 → <cwd>/.opencode/skills/deck-studio
node install.mjs --check     # 只查环境（Node/浏览器/playwright-core/Python）
node install.mjs --pack      # 打离线包（vendor playwright-core，整目录拷去内网后 node install.mjs）
```

安装脚本自动完成：环境检测（Node ≥18；**Chrome 为首选浏览器**，机器无 Chrome 时自动回退 Edge/Chromium——win 内网常见形态零配置，也可用 `AICO_BROWSER_EXECUTABLE` 显式指定）、vendor playwright-core 进技能目录（**已随仓 vendor 在 `deck-studio/node_modules/`，克隆即完整，离线跑门禁**）、安装指纹 `_install_meta.json`。win 双击 `install.bat`（自动找 Node、跑完暂停）。装完重启 opencode 即被发现。

## 参考文档索引（按需读取，不要一次全读）

| 文件 | 何时读 |
|------|--------|
| `references/process.md` | Phase 1/2/5 —— 协作流程深度规范（五件事、事实整理、场景适配表、plan.md、内容自检、讨论纪律） |
| `references/theme.md` | Phase 4 —— 色板 token 体系与使用约束（含品牌模板豁免） |
| `references/presets.md` | Phase 3 —— 12 套预设清单与 token 覆盖 |
| `references/page-types.md` | Phase 2/4 —— 页型库：默认选库内页型，自绘例外 |
| `references/layout.md` | Phase 4 —— 固定画布排版刻度、卡片语汇、密度、审美硬要求 |
| `references/player.md` | Phase 4 —— 舞台行为契约与播放器壳 DOM（引擎源码以 assets/effects 为准） |
| `references/svg-diagrams.md` | Phase 4 —— 架构图/流程图/图表规范与模板 |
| `references/animation.md` | Phase 2/4 —— 动画申报制：流线语言法则、机制速查表、四类声明格式、节奏依据 |
| `assets/effects/` | Phase 4 —— 引擎唯一源六件套（player.js 核心 / stepfx.js 步进 / auto.js 流线动线 / countup.js 数字滚动 / ambient.js 常驻流转 / exporter.js 一键导出 + effects.css）：标记块由 sync-engine 写入，**严禁手改**；作者只写数据声明。deck-bar 含 #pptxBtn 时按 P 一键导出快照 PPTX |
| `assets/templates/yunshan.html` | Phase 4 —— 品牌模板与全页型骨架基准（封面/目录/内容页/卡片网格/表格混排/深蓝金句/结束页）：复制后改填写区、按页型增删 section、替换占位文案 |
| `scripts/` | Phase 4/5/7 —— sync-engine（引擎写入/校验）、verify 四件套（溢出/截图/e2e/目检）、html2pptx（导出）、serve/deck-serve（人手微调服务：编辑态注入 + 保存写回 + 门禁联动） |
| `references/copywriting.md` | Phase 1/2/4 —— 文案规范（中文、标题句式、数字） |

## 常见故障

整页白屏/不渲染：舞台结构必须 `deck-stage > deck-fit > section.slide`，引擎块缺失或被手改时重跑 sync-engine。动画不触发：数据区声明的页 label 与 `data-label` 不一致、漏跑 sync-engine、或系统开了 reduced-motion（最后一种是设计行为）。按键/点击无响应：引擎块是否为当前版本（旧拷贝有已知缺陷），重跑 sync-engine。页溢出：优先拆页，其次降排版刻度（禁 vw/vh 缩字）。字体不加载：查 Fontshare/Google Fonts URL 与 CSS 字体名。导出页数不符：查 `data-label` 唯一性与 section 数量。性能：动画只用 transform/opacity。
