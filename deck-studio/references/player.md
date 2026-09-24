# player.md — 舞台框架与双模式播放器（行为契约）

**每个 deck 必含。** 引擎代码的唯一源在 `assets/effects/`（player.js 核心 + stepfx/auto/countup/ambient 混合层），由 `scripts/sync-engine.mjs` 以 `═══ DECK ENGINE ═══` 标记块写入 deck——**本文档只定义行为契约，不含源码；改引擎行为 = 改五件套再同步，不改本文档之外任何副本**。

## 双模式

- **浏览模式（默认，`body.browse`）**：全部页面纵向堆叠成无缝长页，`.deck-stage` 容器内自由滚动（像 PDF 阅读器），每页独立投影卡片；键盘/缩略图提供页级精确定位；reveal 全显供阅读。
- **放映模式（F / ▶ 按钮，`body.presenting`）**：全屏单页居中 letterbox，reveal 节拍步进（→/单击逐条放出，放完翻页），末页两次确认退出；P 聚光灯可用；放映恒自封面起。

换页是显式 `applyCurrent/show`，**不使用 IntersectionObserver**；浏览模式的滚动发生在 `.deck-stage` 容器内，根文档永远零滚动。

## 与工具的契约（measure_overflow / shot / e2e 按此工作，**类名不可改**）

`.deck-stage` / `.deck-fit` / `.deck-bar` / `.deck-menu` / `.deck-sidebar` / `.deck-progress` / `.pres-cursor` / `.pres-cursor-hint` / `.player-hint`；页元素 `section.slide[data-label]`（data-label 是页的唯一标识，工具按它定位）；渐显 `.reveal`；步进标记 `.shown`；模式类 `body.browse` / `body.presenting`。（`.nav-dots` 已废弃合并进 `.deck-bar`，工具隐藏清单保留其为旧 deck 兼容 no-op。）

## 播放器壳 DOM（引擎按此查物；模板 yunshan.html 即基准）

```
<div class="deck-stage" id="deckStage">
  <div class="deck-fit" id="deckFit">
    <section class="slide" data-label="…">…</section> × N
  </div>
</div>
<div class="deck-progress"><div id="progressBar"></div></div>
<header class="deck-bar">
  <button class="deck-menu" id="deckMenu">☰</button>
  <span class="deck-page" id="deckPage"></span>
  <button class="deck-present-btn" id="presentBtn">▶ 放映</button>
</header>
<aside class="deck-sidebar" id="deckSidebar">
  <div class="deck-sidebar-head"><span>页面目录</span><button id="tocClose">×</button></div>
  <div class="deck-thumbs" id="deckThumbs"></div>
</aside>
<div class="player-hint" id="playerHint"></div>
<div class="pres-cursor" id="presCursor"><div class="pres-spotlight"></div><div class="pres-dot"></div></div>
<div class="pres-cursor-hint" id="presCursorHint"></div>
```

可选件（缺省即功能关闭，引擎特性检测）：`#deckSidebar/#deckThumbs/#deckMenu/#tocClose`（缩略图目录）、`#presCursor`（聚光灯，无则 P 键不启用）。**必需件**：舞台三件套 + `#deckBar` 组。

## 行为要点（改动前必读）

- **双模式布局靠 body 类切换**：`body.browse`（长页堆叠 + stage 滚动）vs `body.presenting`（单页 letterbox + 步进）；放映态同时隐藏全部 chrome。
- **浏览滚动高度补偿**：transform 不参与布局，浏览模式用 `marginBottom = flowH×(scale−1)` 把滚动高度收账到视觉高度——删掉它滚动条会长出一截。
- **滚动回收 current**：浏览模式滚动事件 rAF 节流算页，`applyCurrent` 保持 `.current` 类（CSS 在 browse 下不用它控制可见性，但工具与 e2e 靠它判页）。
- **同页重入护栏**：放映态 `show()` 对同页直接返回——否则末页再按 → 触发"进页清空 .shown"无限重演。
- **末页语义**：放映节拍放完再按 → → 第一次武装提示，第二次 `endPresent()` 停在末页回浏览。
- **缩略图 = DOM 克隆**（去 `.slide` 类、剥 id、`.thumb-page` 自足样式 + reveal 强制最终态）；点缩略图跳页**不关侧栏**（连续预览），点击侧栏外任意区域、Esc 或 × 关闭。
- **侧栏点外即关的 return 语义**：关侧栏的那次点击不再推进页/节拍——一次点击只做一件事。
- **按键表**：F 放映/退出 · P 聚光灯（有 `#presCursor` 时）· →/↓/PgDn/空格 推进 · ←/↑/PgUp 回退 · Home/End 首末页 · Esc 关侧栏（全屏下 Esc 先由浏览器退全屏，`fullscreenchange` 同步退放映）。
- **工具侧契约**：measure_overflow / shot 注入强制 CSS（stage 静态化 + fit 取缩放与 margin + 页全显 + chrome 隐藏），见脚本内注释。

## 动画步进程序（可选；申报格式、机制速查表与判据见 animation.md）

放映态 `step()` 顶部优先调用申报程序，无申报回退 reveal 节拍步进：

```js
step() {
    if (this.presenting) {
        if (this.programStep && this.programStep()) return;  // 申报程序优先
        ...reveal 节拍步进...
    }
}
```

程序数据由 deck 数据区声明（`DECK_STEPS` / `DECK_AUTO` / `DECK_COUNTUP` / `DECK_AMBIENT`），引擎只读。fx 全部画在运行时 `<g class="fx-layer">`（追加到当前页 svg 内，viewBox 坐标随画布缩放）；样式层见 `assets/effects/effects.css`。

**工程不变式**：① 终态 = 静态整页——任何动画结束 fx 层清空即还原，门禁/截图/缩略图/导出零适配；② 讲者主权——动画中点击=快进、闸口点击=确认、reduced-motion 直达终态；③ 引擎暴露 `window.__deck`（`busy`/`pi`/`tourWait`/`current`）供 e2e 确定性等待；④ 命名约束：fx 元素缓存属性勿与方法同名（缓存属性一律以 `newToken` 等动词命名）；⑤ 动作清理用局部引用 + `finally` 复位 busy——等待窗口内换页不得产生悬空引用或卡死输入。
