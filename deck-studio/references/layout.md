# layout.md — 视口适配与布局基建（宪法级，每个 deck 必含）

**铁律：每页 = 恰好一个视口高（100vh/100dvh）。内容放不下 → 拆页或减内容。页内永不滚动。**

## 每页内容密度上限

| 页型 | 上限 |
|------|------|
| 标题页 | 1 主标题 + 1 副标题 + 可选 tagline |
| 内容页 | 1 标题 + 4–6 要点，或 1 标题 + 2 段 |
| 特性网格 | 1 标题 + 最多 6 卡（2×3 / 3×2） |
| 代码页 | 1 标题 + 最多 8–10 行代码 |
| 引用页 | 1 句引文（≤3 行）+ 署名 |
| 图片页 | 1 标题 + 1 图（高 ≤60vh） |

超出上限 → 拆成多页。

## 必含基础 CSS（原样包含进每个 deck）

```css
/* ===== 视口适配：强制基础样式 ===== */

/* 1. html/body 锁定视口 */
html, body { height: 100%; overflow-x: hidden; }
html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }

/* 2. 每页 = 精确一个视口高 */
.slide {
    width: 100vw;
    height: 100vh;
    height: 100dvh;      /* 移动浏览器动态视口 */
    overflow: hidden;    /* 关键：杜绝任何溢出滚动 */
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    position: relative;
}

/* 3. 内容容器 flex 居中 */
.slide-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: 100%;
    overflow: hidden;    /* 双保险 */
    padding: var(--slide-padding);
}

/* 4. 排版全部 clamp() 响应式缩放 */
:root {
    --title-size: clamp(1.5rem, 5vw, 4rem);
    --h2-size: clamp(1.25rem, 3.5vw, 2.5rem);
    --h3-size: clamp(1rem, 2.5vw, 1.75rem);
    --body-size: clamp(0.75rem, 1.5vw, 1.125rem);
    --small-size: clamp(0.65rem, 1vw, 0.875rem);
    --slide-padding: clamp(1rem, 4vw, 4rem);
    --content-gap: clamp(0.5rem, 2vw, 2rem);
    --element-gap: clamp(0.25rem, 1vw, 1rem);
}

/* 5. 卡片/容器视口相对限尺寸 */
.card, .container, .content-box {
    max-width: min(90vw, 1000px);
    max-height: min(80vh, 700px);
}

/* 6. 列表随视口缩放 */
.feature-list, .bullet-list { gap: clamp(0.4rem, 1vh, 1rem); }
.feature-list li, .bullet-list li {
    font-size: var(--body-size);
    line-height: 1.4;
}

/* 7. 网格自适应 */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
    gap: clamp(0.5rem, 1.5vw, 1rem);
}

/* 8. 图片约束 */
img, .image-container {
    max-width: 100%;
    max-height: min(50vh, 400px);
    object-fit: contain;
}

/* ===== 响应式断点 ===== */
@media (max-height: 700px) {
    :root {
        --slide-padding: clamp(0.75rem, 3vw, 2rem);
        --content-gap: clamp(0.4rem, 1.5vw, 1rem);
        --title-size: clamp(1.25rem, 4.5vw, 2.5rem);
        --h2-size: clamp(1rem, 3vw, 1.75rem);
    }
}
@media (max-height: 600px) {
    :root {
        --slide-padding: clamp(0.5rem, 2.5vw, 1.5rem);
        --content-gap: clamp(0.3rem, 1vw, 0.75rem);
        --title-size: clamp(1.1rem, 4vw, 2rem);
        --body-size: clamp(0.7rem, 1.2vw, 0.95rem);
    }
    .nav-dots, .keyboard-hint, .decorative { display: none; }
}
@media (max-height: 500px) {
    :root {
        --slide-padding: clamp(0.4rem, 2vw, 1rem);
        --title-size: clamp(1rem, 3.5vw, 1.5rem);
        --h2-size: clamp(0.9rem, 2.5vw, 1.25rem);
        --body-size: clamp(0.65rem, 1vw, 0.85rem);
    }
}
@media (max-width: 600px) {
    :root { --title-size: clamp(1.25rem, 7vw, 2.5rem); }
    .grid { grid-template-columns: 1fr; }
}

/* ===== 动效偏好尊重 ===== */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.2s !important;
    }
    html { scroll-behavior: auto; }
}
```

## 溢出预防清单（生成前自查）

1. 每个 `.slide` 有 `height:100vh; height:100dvh; overflow:hidden`
2. 字号全部 `clamp()`
3. 间距全部 `clamp()` 或视口单位
4. 内容容器有 `max-height` 约束
5. 图片有 `max-height: min(50vh,400px)` 类约束
6. 网格用 `auto-fit` + `minmax()`
7. 高度断点 700/600/500 齐备
8. 内容元素无固定像素高
9. 每页尊重密度上限

生成后跑机器门禁（SKILL.md Phase 5 命令），不要只靠本清单。

## 放不下时怎么办

**做**：拆页；减要点（每页 ≤5–6 条）；每条压到 1–2 行；代码片段改短；做"续页"。
**不做**：字号压到不可读下限以下；删光内边距；允许滚动；硬塞。

## 目检尺寸建议（交付前抽查）

桌面 1920×1080 / 1440×900 / 1280×720；平板 1024×768；手机 375×667、横屏 667×375。门禁与导出固定按 1920×1080 工作——设计时按 16:9 预览目检。

## 通用布局规则

| 规则 | 做法 |
|------|------|
| 字体自适应 | 字号相对视口：vw 单位（1vw = 窗口宽 1%） |
| 标题一行 | `white-space: nowrap` 或缩字号，尽量不折行 |
| 少空白 | 减 padding/gap、增字号，内容要充实 |
| 不超视口 | `overflow:hidden` + flex 子项 `min-height:0` |
| 底部总结居中 | flex `align-items:center; justify-content:center` |
| 先定比例再填内容 | 每页先定区块占比（如顶 60%/底 40%）再填，不要写完内容再调布局 |
