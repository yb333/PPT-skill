# presets.md — 风格预设库（宪法 1：预设 = token 覆盖，显式选择才生效）

用户在 Phase 3 **显式选择**预设后才使用；默认走蓝色三层主题（theme.md）。

## 预设清单

| Preset | Vibe | Best For |
|--------|------|----------|
| Bold Signal | Confident, high-impact | Pitch decks, keynotes |
| Electric Studio | Clean, professional | Agency presentations |
| Creative Voltage | Energetic, retro-modern | Creative pitches |
| Dark Botanical | Elegant, sophisticated | Premium brands |
| Notebook Tabs | Editorial, organized | Reports, reviews |
| Pastel Geometry | Friendly, approachable | Product overviews |
| Split Pastel | Playful, modern | Creative agencies |
| Vintage Editorial | Witty, personality-driven | Personal brands |
| Neon Cyber | Futuristic, techy | Tech startups |
| Terminal Green | Developer-focused | Dev tools, APIs |
| Swiss Modern | Minimal, precise | Corporate, data |
| Paper & Ink | Literary, thoughtful | Storytelling |

心情 → 候选预设（guided discovery 挑 3 个生成预览）：

| Mood | 候选 |
|------|------|
| Impressed/Confident | Bold Signal, Electric Studio, Dark Botanical |
| Excited/Energized | Creative Voltage, Neon Cyber, Split Pastel |
| Calm/Focused | Notebook Tabs, Paper & Ink, Swiss Modern |
| Inspired/Moved | Dark Botanical, Vintage Editorial, Pastel Geometry |

## Token 覆盖格式

预设只覆盖 `:root` token（可增补），布局与视口适配规则不变：

```css
/* 预设示例：Bold Signal（暗底 + 高冲击） */
:root {
  --bg-primary: #1a1a1a;      /* 预设可增补背景 token */
  --card-bg: #FF5722;
  --text-primary: #ffffff;
  --text-on-card: #1a1a1a;
  /* 覆盖不到的语义 token 沿用默认或按预设气质重定义 */
}
```

每个预设的具体 token 值在生成时按其气质现场定义并保持全套一致（背景/强调/文字/卡片四组颜色成体系），不必死记固定 hex。

## 风格预览生成规则（show, don't tell）

- 用户说不清偏好 → 问一个多选 mood 问题 → 生成 3 个预览文件到 `.claude-design/slide-previews/style-{a,b,c}.html`
- 每个预览是**单页 title slide**：自包含、内联 CSS/JS、带入场动画演示动效气质、约 50–100 行
- 用户看后挑一个或要求混搭；直接点名预设的跳过发现流程

## 反"AI 味"清单（生成预览与正式 deck 都适用）

禁用：白底紫渐变、Inter/Roboto/纯系统字体、标准蓝主色、可预测的 hero 布局。
改用：有个性的字体组合（Clash Display、Satoshi、Cormorant Garamond、DM Sans 等，经 Fontshare/Google Fonts）、成体系的配色、有氛围的背景（渐变/纹理/深度）、标志性动画瞬间。

## CSS 陷阱（必看）

**CSS 函数取负必须套 calc**：`-clamp()` / `-min()` / `-max()` 会被浏览器**静默忽略**且无控制台报错。永远写 `calc(-1 * clamp(...))`。

## 不变的底线

无论选什么预设：视口适配规则（layout.md）、deck↔工具契约（SKILL.md）一字不让——预设只改颜色与字体气质。
