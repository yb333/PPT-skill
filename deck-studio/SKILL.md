---
name: deck-studio
description: 试用中的下一代 HTML 演示技能 deck-studio。在 frontend-slides 基础上融合：机器验证门禁（溢出检测）、PPTX 一键导出、全屏放映播放器。仅当用户显式点名 deck-studio 或要求试用新技能时使用；常规 PPT/slides 请求仍走 frontend-slides。
---

# Deck Studio — HTML 演示工作室（试用期）

frontend-slides 的融合重构后继（研发仓：`/Users/yuanbo/frontend-slides/deck-studio/`）。相比原技能新增：**人机协同流程强化**（需求共识/事实整理/规划落盘）、**机器门禁**（溢出检测代替人工清单）、**PPTX 导出**（单向快照投影）、**播放器壳**（全屏放映、点击推进、reveal 步进）。

## 核心理念

1. **人机协同共建** — 结构与动画与用户一起讨论产出，不是套模板填内容。大纲（Phase 1）与 Design Spec（Phase 2）是硬确认闸门。
2. **零依赖单文件** — 单 HTML 内联 CSS/JS，无构建工具，离线可拷走。
3. **Show, Don't Tell** — 用户说不清偏好就生成预览让他反应，不给抽象选项。
4. **表达力优先** — 动画/演示光标/响应式是 HTML deck 对传统 PPT 的核心优势，不为 PPTX 可移植性牺牲；导出时压平为最终态快照（见宪法 3）。
5. **视口适配（不可协商）** — 每页恰为一屏（100vw × 100vh），页内永不滚动；放不下就拆页。

## 三条产品宪法（详版见 docs/DECISIONS.md，此处为执行摘要）

1. **色板主权**：蓝色三层 token 体系是默认主题；预设仅是用户显式选择后的 token 覆盖。规范见 `references/theme.md`。
2. **HTML 唯一事实源**：PPTX 是快照投影、无动画、每页=最终态；单一导出入口，导出后校验页数平价；不承诺 pptx→html 回流。
3. **表达力优先**：动画自由使用，导出负责压平。

## 默认配置（老板偏好）

- 尺寸：自适应浏览器窗口（100vw × 100vh）；主题：亮色白底 + 蓝色系；字体：大字体（正文 20px+、标题 32px+，vw 单位）；布局：少空白、内容充实、工整对齐；输出：单 HTML 文件。
- 交付默认 HTML；用户明确要 .pptx 时才导出（Phase 7）。

## Deck ↔ 工具契约（每个生成的 deck 必须遵守，验证/导出工具按此工作）

1. 页面元素：`<section class="slide" data-label="页面标识">`。`data-label` 是页的唯一标识（中文短语，如 `data-label="上下文管理"`），工具按它定位页。
2. 画布：`.slide` 为 100vw × 100vh、`overflow: hidden`，无 transform 祖先、无缩放容器。
3. 渐显：统一用 `.reveal` + `.slide.visible .reveal { opacity:1 }` 模式（IntersectionObserver 给进入视口的 `.slide` 加 `.visible`）。
4. 播放器杂物统一类名：`.deck-progress`（顶部进度条）、`.nav-dots`、`.pres-cursor`、`.pres-cursor-hint`、`.player-hint`——工具截图/测量前会隐藏它们。
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

把大纲细化到可一次成型生成：每页的区块占比、SVG 关键参数（viewBox/元素坐标/配色 token）、完整文本（精确到每个 label）、**编排层动画声明**（元素+时机+效果，选自动画词表；通用层 reveal 无需声明，默认全带）。

- ⏸️ **闸门：用户确认 spec 后才进代码生成**。确认重点：SVG 参数合理、文本完整、色彩层正确、动画声明克制（编排层只在确有必要时用）。

## Phase 3: 风格选择

默认路径：**蓝色三层主题，不问直接用**（老板偏好场景）。用户想换风格时才走发现流程：问感受（可多选 2 个）→ 生成 3 个风格预览（单页 title slide，`.claude-design/slide-previews/`）→ 用户挑或混搭。12 套预设清单与 token 覆盖格式见 `references/presets.md`。

选了预设 = 显式豁免蓝色约束（宪法 1）；未选 = Phase 5 色彩检查强制蓝色系。

## Phase 4: 代码生成

输入：Phase 1 内容 + Phase 2 spec + Phase 3 风格。产出单 HTML 文件。

- **必读 `references/layout.md`**：视口适配 CSS 基建全文、密度上限、断点、溢出预防清单。
- **必读 `references/player.md`**：播放器壳标准实现（进度条/nav dots/聚光灯/全屏放映 F/点击推进/reveal 步进），每个 deck 都要包含。
- 图表/架构图/流程图：**必读 `references/svg-diagrams.md`**，inline SVG，禁 emoji/ASCII 图。
- 文案落纸：**对照 `references/copywriting.md`**（中文规范、标题即观点、数字用法、删字检查）。
- 动画：通用层默认全带；编排层按 spec 声明实现，词表与范式见 `references/animation.md`。

HTML 骨架要点：`:root` token 变量区 → 基建样式 → 播放器样式 → 每页 `section.slide[data-label]` → `SlidePresentation` 控制器（键盘/触摸/滚轮导航 + IO 渐显 + 播放器壳）。代码注释解释"做什么/为什么/怎么改"。

**分段并行策略**：≤10 页单文件一次生成；11–15 页拆 2 段；>15 页拆 3 段（每段 5–7 页）。合并规则：CSS 只留一份 `:root` 去重；SVG `<defs>` 的 gradient/marker id 不冲突；data-label 保持唯一；nav dots 从第 2 页开始、总数=页数-1；JS 只留一个控制器、`totalSlides` 动态计算。

## Phase 5: 迭代打磨（机器门禁）

每次修改后**必须**跑溢出门禁（退出码非 0 就修，修完重跑；最多迭代 3 轮仍红则带着输出求助用户）：

```bash
node ~/.zcode/skills/deck-studio/scripts/verify/measure_overflow.mjs <deck.html> --all   # 退出码 0=全过
node ~/.zcode/skills/deck-studio/scripts/verify/shot.mjs <deck.html> <data-label> /tmp/page.jpg  # 重点页目检
```

（开发仓路径：`/Users/yuanbo/frontend-slides/deck-studio/scripts/verify/`。）

人工清单（门禁之外逐项过）：SVG viewBox ≥ 内容最大 y + padding；标签不重叠（相近 y 间隔 ≥14px）；卡片精确包裹内容；中文术语首现附英文括号；默认路径无绿/橙/紫（蓝板宪法）；渐变垂直方向；SVG `font-size="N"` 无 px 后缀；正文 ≥12px。完整清单与协作纪律（按页记录修改、逐章引导反馈、结构性意见在初版轮消化）见 `references/process.md`。

## Phase 6: PPTX → HTML 提取（Mode B）

用 `python-pptx` 提取（文本按 shape 遍历、图片导出到 assets/、notes 保留），整理成结构清单**给用户确认**后，走 Phase 3 风格选择 → Phase 4 生成 HTML。保留原 ppt 的全部文本、图片、页序。

## Phase 7: 交付

1. 清理 `.claude-design/slide-previews/` 等临时产物。
2. 交付 HTML（`open <file>.html` 或发文件路径），附导航说明（←/→/Space 翻页、F 全屏、P 聚光灯）。
3. 用户需要 .pptx 时导出（宪法 2：快照投影，无动画）：

```bash
python3 ~/.zcode/skills/deck-studio/scripts/html2pptx/convert.py <deck.html> <out.pptx>   # image 模式
```

导出后自检：pptx 页数 == deck 页数；用 WPS/PowerPoint 打开抽查重点页。

## 参考文档索引（按需读取，不要一次全读）

| 文件 | 何时读 |
|------|--------|
| `references/process.md` | Phase 1/2/5 —— 协作流程深度规范（五件事、事实整理、场景适配表、plan.md、内容自检、讨论纪律） |
| `references/theme.md` | Phase 4 —— 色板 token 体系与使用约束 |
| `references/presets.md` | Phase 3 —— 12 套预设清单与 token 覆盖 |
| `references/layout.md` | Phase 4 —— 视口适配 CSS 基建、密度上限、断点 |
| `references/player.md` | Phase 4 —— 播放器壳标准实现 |
| `references/svg-diagrams.md` | Phase 4 —— 架构图/流程图/图表规范与模板 |
| `references/animation.md` | Phase 4 —— 动画两层策略与词表 |
| `references/copywriting.md` | Phase 1/2/4 —— 文案规范（中文、标题句式、数字） |

## 常见故障

字体不加载：查 Fontshare/Google Fonts URL 与 CSS 字体名。动画不触发：查 IO 是否给 `.slide` 加了 `.visible`。scroll-snap 失效：`scroll-snap-type` 在 html 上、每页 `scroll-snap-align:start`。性能：动画只用 transform/opacity，`will-change` 少用，scroll/mousemove 节流。
