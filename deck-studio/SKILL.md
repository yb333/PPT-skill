---
name: deck-studio
description: 试用中的下一代 HTML 演示技能 deck-studio。在 frontend-slides 基础上融合：机器验证门禁（溢出检测）、PPTX 一键导出、全屏放映播放器。仅当用户显式点名 deck-studio 或要求试用新技能时使用；常规 PPT/slides 请求仍走 frontend-slides。
---

# Deck Studio — HTML 演示工作室（试用期）

frontend-slides 的融合重构后继。相比原技能新增：**人机协同流程强化**（需求共识/事实整理/规划落盘）、**机器门禁**（溢出检测代替人工清单）、**引擎唯一源**（标记块写入，杜绝手写引擎）、**PPTX 导出**（单向快照投影）、**播放器壳**（全屏放映、流线动画、聚光灯）。

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

1. **复制模板**：`assets/templates/yunshan.html` 是全页型骨架基准（封面/内容页/卡片网格/表格混排/深蓝金句/结束页 + 引擎标记块占位）。云山体系直接用；其他品牌删品牌资产、换 token，骨架照用。
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
2. 交付 HTML（`open <file>.html` 或发文件路径），附导航说明（浏览=滚轮长页滚动、←/→ 页级定位、F 放映（→/单击逐条推进）、P 聚光灯、左上角 ☰ 页面目录）。
3. 用户需要 .pptx 时导出（宪法 2：快照投影，无动画）：

```bash
python3 <skill>/scripts/html2pptx/convert.py <deck.html> <out.pptx>   # image 模式
```

导出后自检：pptx 页数 == deck 页数；用 WPS/PowerPoint 打开抽查重点页。

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
| `assets/effects/` | Phase 4 —— 引擎唯一源五件套（player.js 核心 / stepfx.js 步进 / auto.js 流线动线 / countup.js 数字滚动 / ambient.js 常驻流转 + effects.css）：标记块由 sync-engine 写入，**严禁手改**；作者只写数据声明 |
| `assets/templates/yunshan.html` | Phase 4 —— 品牌模板与全页型骨架基准（封面/内容页/卡片网格/表格混排/深蓝金句/结束页）：复制后改填写区、按页型增删 section、替换占位文案 |
| `scripts/` | Phase 4/5/7 —— sync-engine（引擎写入/校验）、verify 四件套（溢出/截图/e2e/目检）、html2pptx（导出） |
| `references/copywriting.md` | Phase 1/2/4 —— 文案规范（中文、标题句式、数字） |

## 常见故障

整页白屏/不渲染：舞台结构必须 `deck-stage > deck-fit > section.slide`，引擎块缺失或被手改时重跑 sync-engine。动画不触发：数据区声明的页 label 与 `data-label` 不一致、漏跑 sync-engine、或系统开了 reduced-motion（最后一种是设计行为）。按键/点击无响应：引擎块是否为当前版本（旧拷贝有已知缺陷），重跑 sync-engine。页溢出：优先拆页，其次降排版刻度（禁 vw/vh 缩字）。字体不加载：查 Fontshare/Google Fonts URL 与 CSS 字体名。导出页数不符：查 `data-label` 唯一性与 section 数量。性能：动画只用 transform/opacity。
