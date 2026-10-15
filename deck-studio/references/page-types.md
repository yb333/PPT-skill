# page-types.md — 页型库（默认选库，自绘例外）

**生成任何一页前先查本库。** 大部分场景直接选库内页型按骨架填内容；只有库表达不了的机制/架构/流程图才自绘 SVG（→ `svg-diagrams.md`）。选型时把本库"常用于"当索引，占位说明就是"这一栏该写什么"的说明书。配色一律走 token（theme.md），本文骨架中的强调色以 `--c-exec` 等引用。

## 页型总表

| 页型 | 长什么样 | 常用于 |
|------|---------|--------|
| 封面 | 超大主标题 + 强调色副标题条 + 底部主讲人/日期行 | deck 第一页，一份一张 |
| 目录 | 左侧竖排"目录/CONTENTS"+ 右侧章级条目（章号 mono + 章名 + 一句摘要 + 页码范围），条目可点跳页 | **≥7 页 deck 必备**，紧跟封面 |
| 内容页骨架 | eyebrow + 大标题 + 主体（flex:1） | **大多数页的起点** |
| 卡片网格 | 2×3 / 3×2 同构卡片阵列 | 一组并列概念/能力/要点 |
| 左图右文 | 左图（height:100% 放大填满）+ 右文解释列 | 一图为主、文字为辅 |
| 对比两栏 | 左右两个同构面板（旧 vs 新 / 问题 vs 方案） | 对比、取舍、AS-IS/TO-BE |
| 流程条 | 横向节点 + 箭头，阶段底色分组 | 步骤/流水线（简单场景） |
| 表格混排 | 深蓝表头 + 黑边框 + 分组粗外框 | 多维信息、矩阵、清单 |
| 全幅大图/截图对照 | 一张大图或两图上下对照 + 短标注 | 用真料说话、证据页 |
| KPI 数据带 | 大号强调色数字 + 小单位，横排 3–4 联 | 成果/指标页 |
| 金句页 | 深底大字一句话 + 署名 | 章节小结、情绪落点 |
| 结语页 | 致谢 + 行动号召/联系方式 | deck 最后一页 |

节奏规则：**连续 3 页不用同一视觉家族**；密页（表格/密集多栏）后面接轻页（全幅图/金句）缓一口气。章扉页已退役：结构职能由目录页承担，不再生成。

## 关键骨架

### 目录页（≥7 页 deck 必备，紧跟封面）

deck 按章规划（process.md：先分章再排页），目录是章级结构的唯一承载，每条对应一章：

```html
<section class="slide" data-label="目录">
  <div class="brand-corner"><i></i><i></i></div>
  <div class="toc-side">
    <div class="eyebrow">CONTENTS</div>
    <div class="toc-word">目录</div>
    <div class="toc-sub">AGENDA</div>
  </div>
  <div class="toc-list">
    <div class="toc-item" data-toc="章首页label">
      <span class="toc-num">01</span>
      <span class="toc-body"><b class="toc-chapter">章名：这一章回答的子问题</b>
        <i class="toc-desc">一句话说明本章内容 · P03–04</i></span>
    </div>
    <!-- × 3–6 条 -->
  </div>
  <div class="page-num">02 / N</div>
</section>
```

硬规则（e2e 门禁拦截）：

- **章级粒度，3–6 条**（门禁区间 2–9）：目录列章不列页，14 页的 deck 列 13 条必撞密度门禁
- `data-toc` = 该章**首页**的 `data-label`；点击跳页由引擎内置（放映/浏览皆可），**禁手写跳页 JS**；e2e 检查死链
- 条目序号 = 章号，与各内容页 eyebrow 的 `章.节` 编号（`1.1 · 背景`）一致——观众随时对得上"讲到第几章"
- 描述行带页码范围（`P03–04`）：手工维护，页序变动时与 eyebrow 同批更新
- 入场动画：`window.DECK_AUTO = { 目录: [['enter', '.toc-item', 90]] }`（animation.md enter 微指令）；
  不做"回到目录高亮当前章"——遇到真实需要再加
- ≤6 页的 deck 不放目录：条目比页还多是负担

### 内容页骨架（最常用）

```html
<section class="slide" data-label="页名">
  <div style="font-family:ui-monospace,monospace;font-size:18px;letter-spacing:.2em;color:var(--c-exec);margin-bottom:10px;">1.3 · 小节名 / ENGLISH</div>
  <h3 style="margin:0 0 8px;font-weight:600;font-size:46px;letter-spacing:-.02em;color:var(--text);">大标题</h3>
  <!-- 导语默认省略；必须写时：21px，--text-sub -->
  <div style="flex:1;min-height:0;">
    <!-- 主体：卡片 / 两栏 / 网格 / 图 -->
  </div>
</section>
```

### 卡片网格

```html
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;height:100%;">
  <!-- × N 张统一卡片（骨架见 layout.md），每卡一个概念 -->
</div>
```

### 左图右文

```html
<div style="display:flex;gap:34px;align-items:center;height:100%;">
  <div style="flex:0 0 auto;max-width:60%;min-width:0;height:100%;display:flex;align-items:center;justify-content:center;">
    <img src="…" alt="说明" style="height:100%;width:auto;max-width:100%;object-fit:contain;display:block;border:1px solid #ececec;border-radius:10px;">
  </div>
  <div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:12px;">
    <div style="font-size:24px;font-weight:600;">小标题</div>
    <div style="font-size:21px;color:var(--text-sub);line-height:1.6;">正文…</div>
  </div>
</div>
```

要点：图用 `height:100%;width:auto`（不是 max-*，否则小图不放大、四周留白败笔）。

### 对比两栏

```html
<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;height:100%;">
  <div style="border:1px solid #e7e7e7;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:12px;background:#fafafa;">
    <div style="font-size:24px;font-weight:700;color:var(--text-sub);">旧方案 / 问题</div>
    <!-- 要点，21px -->
  </div>
  <div style="border:1.5px solid var(--c-exec);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:12px;background:#fff;">
    <div style="font-size:24px;font-weight:700;color:var(--c-exec);">新方案 / 结论</div>
    <!-- 只有"被选中/更优"语义允许强调边框 -->
  </div>
</div>
```

### 表格混排

```html
<table style="width:100%;border-collapse:collapse;font-size:17px;">
  <thead><tr>
    <th style="background:var(--c-exec);color:#fff;padding:12px;border:1px solid #1e293b;">列一 15%</th>
    <th style="background:var(--c-exec);color:#fff;padding:12px;border:1px solid #1e293b;">列二 19%</th>
    <th style="background:var(--c-exec);color:#fff;padding:12px;border:1px solid #1e293b;">说明 66%</th>
  </tr></thead>
  <tbody><!-- 行：黑边框 1px；分组范围外框 3px；文字单行优先，放不下自然换行，禁止 nowrap 裁切 --></tbody>
</table>
```

### KPI 数据带

```html
<div style="display:flex;gap:48px;justify-content:center;align-items:baseline;">
  <div><span style="font-size:72px;font-weight:800;color:var(--c-exec);">1.76×</span><span style="font-size:21px;color:var(--text);"> 吞吐</span></div>
  <!-- × 3–4 联；数字必大必变色，单位小号紧贴（copywriting.md 数字用法） -->
</div>
```

### 金句页（深底）

```html
<section class="slide" data-label="金句" style="background:var(--text);align-items:center;justify-content:center;text-align:center;">
  <div style="font-size:54px;font-weight:700;color:#fff;line-height:1.4;max-width:80%;">一句话结论</div>
  <div style="font-size:21px;color:#93c5fd;margin-top:28px;">— 署名 / 出处</div>
</section>
```

深底页强调用浅蓝（`--c-guard`/`#93c5fd`），避免深底上大面积红/橙。

## 选库决策顺序

1. 这页回答什么问题（process.md 页面任务）→
2. 库里有匹配页型吗？**有 → 直接用骨架**；多个候选按信息形态定（并列=网格、因果=流程条、取舍=对比、多维=表格）；
3. 库不能表达（机制咬合/架构分层/数据结构图）→ 自绘 SVG（svg-diagrams.md），Design Spec 里声明；
4. 生成后跑门禁 + 按 layout.md 审美硬要求自查。
