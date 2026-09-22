# player.md — 舞台框架与双模式播放器（决策 D7：打开就像 PPT）

**每个 deck 必含。** 固定 1920×1080 画布，双模式：

- **浏览模式（默认，`body.browse`）**：全部页面纵向堆叠成无缝长页，`.deck-stage` 容器内自由滚动（像 PDF 阅读器），每页独立投影卡片；键盘/圆点/缩略图提供页级精确定位；reveal 全显供阅读。
- **放映模式（F / 工具条，`body.presenting`）**：全屏单页居中 letterbox，reveal 节拍步进（→/单击逐条放出，放完翻页），末页两次确认退出；P 聚光灯可用。

换页/翻页是显式 `applyCurrent/goTo`，**不使用 IntersectionObserver**（白页事故根因，见 DECISIONS.md D7）；浏览模式的滚动发生在 `.deck-stage` 容器内，根文档永远零滚动。

与工具的契约（measure_overflow / shot 会注入强制 CSS 并隐藏杂物）——**类名不可改**：
`.deck-stage` / `.deck-fit` / `.deck-bar` / `.deck-menu` / `.deck-sidebar` / `.deck-progress` / `.nav-dots` / `.pres-cursor` / `.pres-cursor-hint` / `.player-hint`；页元素 `section.slide[data-label]`；渐显 `.reveal`；步进标记 `.shown`；模式类 `body.browse` / `body.presenting`。

## HTML（固定结构；body 初始带 browse 类）

```html
<body class="browse">
<div class="deck-stage" id="deckStage">
  <div class="deck-fit" id="deckFit">
    <section class="slide" data-label="封面">…</section>
    <!-- × N，每页 1920×1080，px 排版 -->
  </div>
</div>

<div class="deck-progress"><div id="progressBar"></div></div>
<nav class="nav-dots" id="navDots" aria-label="页面导航"></nav>
<button class="deck-menu" id="deckMenu" title="页面目录"><span>☰</span><span id="deckMenuPage">1/6</span></button>
<header class="deck-bar" id="deckBar">
  <span class="deck-page" id="deckPage">1 / 6</span>
  <button class="deck-present-btn" id="presentBtn" title="放映模式 (F)">▶ 放映</button>
</header>
<aside class="deck-sidebar" id="deckSidebar" aria-label="页面目录">
  <div class="deck-sidebar-head"><span>页面目录</span><button class="deck-sidebar-close" id="tocClose" title="关闭 (Esc)">×</button></div>
  <div class="deck-thumbs" id="deckThumbs"></div>
</aside>
<div class="pres-cursor" id="presCursor"><div class="pres-spotlight"></div><div class="pres-dot"></div></div>
<div class="pres-cursor-hint" id="presCursorHint">按 P 开关演示光标</div>
<div class="player-hint" id="playerHint">滚动浏览 · F 放映 · P 聚光灯</div>
```

## CSS

```css
html, body { height: 100%; margin: 0; overflow: hidden; }  /* 根文档零滚动：白页 bug 的结构性免疫 */
body { background: #e8eaf0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }

/* 舞台：放映=单页居中 letterbox；浏览=长页滚动容器（见模式覆盖） */
.deck-stage { position: fixed; inset: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.deck-fit { width: 1920px; height: 1080px; flex: 0 0 auto; position: relative; overflow: hidden;
  background: #fff; box-shadow: 0 12px 48px rgba(15,23,42,.18); border-radius: 8px; }

/* 页基础（px 排版，layout.md 刻度） */
.slide { width: 1920px; height: 1080px; padding: 56px 90px; display: flex; flex-direction: column;
  overflow: hidden; background: #fff; flex: 0 0 auto; }

/* 渐显：默认全显（浏览阅读态）；仅放映态按 .shown 节拍收放 */
.reveal { transition: opacity .5s var(--ease-out-expo, cubic-bezier(.16,1,.3,1)), transform .5s var(--ease-out-expo, cubic-bezier(.16,1,.3,1)); }
body.presenting .slide.current .reveal:not(.shown) { opacity: 0 !important; transform: translateY(18px) !important; }

/* ===== 放映模式：单页 ===== */
body:not(.browse) .deck-fit { transform-origin: center center; }
body:not(.browse) .slide { position: absolute; inset: 0; visibility: hidden; opacity: 0;
  transition: opacity .35s ease, visibility 0s linear .35s; }
body:not(.browse) .slide.current { visibility: visible; opacity: 1; transition: opacity .35s ease; }

/* ===== 浏览模式：无缝长页 ===== */
body.browse .deck-stage { display: block; overflow-y: auto; overflow-x: hidden; padding: 16px 0 40px; }
body.browse .deck-fit { height: auto; transform-origin: top left; box-shadow: none; border-radius: 0; background: transparent; }
body.browse .slide { position: relative; margin-bottom: 24px; border-radius: 8px; box-shadow: 0 10px 32px rgba(15,23,42,.12); }

/* 进度条 / nav dots / 页码工具条 / 目录胶囊与侧边窗 */
.deck-progress { position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 100; background: rgba(15,23,42,.08); }
#progressBar { height: 100%; width: 0%; background: linear-gradient(90deg, var(--c-info), var(--c-exec)); transition: width .4s ease; }
.nav-dots { position: fixed; right: 14px; top: 50%; transform: translateY(-50%); z-index: 100; display: flex; flex-direction: column; gap: 7px; }
.nav-dot { width: 7px; height: 7px; border-radius: 50%; background: #b6bdc9; cursor: pointer; transition: all .3s ease; }
.nav-dot.active { background: var(--c-exec); transform: scale(1.5); }
.nav-dot:hover { background: var(--c-exec); }
.deck-bar { position: fixed; top: 14px; right: 16px; z-index: 110; display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,.72); backdrop-filter: blur(12px); border: 1px solid rgba(226,232,240,.9);
  border-radius: 999px; padding: 7px 9px 7px 16px; box-shadow: 0 4px 16px rgba(15,23,42,.08);
  font-size: 13px; color: var(--text-sub, #64748b); transition: opacity .4s ease; }
.deck-page { font-variant-numeric: tabular-nums; letter-spacing: .06em; }
.deck-present-btn { border: none; cursor: pointer; border-radius: 999px; padding: 6px 14px;
  background: var(--c-exec, #2563eb); color: #fff; font-size: 13px; font-weight: 600; }
.deck-present-btn:hover { filter: brightness(1.08); }

.deck-menu { position: fixed; top: 14px; left: 16px; z-index: 110; display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.72); backdrop-filter: blur(12px); border: 1px solid rgba(226,232,240,.9);
  border-radius: 999px; padding: 9px 16px; cursor: pointer; font-size: 13px; color: var(--text-sub, #64748b);
  box-shadow: 0 4px 16px rgba(15,23,42,.08); transition: opacity .4s ease; font-variant-numeric: tabular-nums; }
.deck-menu:hover { border-color: var(--c-info, #3b82f6); }
.deck-sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 200; width: 320px;
  background: rgba(248,250,252,.97); backdrop-filter: blur(16px); border-right: 1px solid var(--border-card, #e2e8f0);
  transform: translateX(-100%); transition: transform .35s var(--ease-out-expo, cubic-bezier(.16,1,.3,1));
  display: flex; flex-direction: column; }
.deck-sidebar.open { transform: none; box-shadow: 24px 0 64px rgba(15,23,42,.15); }
.deck-sidebar-head { display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; font-size: 15px; font-weight: 700; color: var(--text, #1e293b);
  border-bottom: 1px solid var(--border-card, #e2e8f0); }
.deck-sidebar-close { border: none; background: none; font-size: 20px; cursor: pointer; color: var(--text-faint, #94a3b8); line-height: 1; }
.deck-thumbs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.thumb-item { cursor: pointer; border: 2px solid transparent; border-radius: 10px; }
.thumb-item.active { border-color: var(--c-exec, #2563eb); }
.thumb-box { width: 100%; height: 162px; overflow: hidden; border-radius: 8px; border: 1px solid var(--border-card, #e2e8f0); position: relative; background: #fff; }
.thumb-inner { width: 1920px; height: 1080px; transform: scale(0.15); transform-origin: top left; position: relative; }
.thumb-page { position: absolute !important; inset: 0 !important; width: 1920px !important; height: 1080px !important;
  display: flex !important; flex-direction: column; padding: 56px 90px !important;
  visibility: visible !important; opacity: 1 !important; background: #fff; overflow: hidden;
  box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
.thumb-page.cover { padding: 108px 130px !important; }
.thumb-page .reveal { opacity: 1 !important; transform: none !important; }
.thumb-label { font-size: 12px; color: var(--text-sub, #64748b); padding: 6px 4px; }

/* 聚光灯光标与提示 chip（.pres-cursor/.pres-spotlight/.pres-dot/.pres-cursor-hint/.player-hint，
   样式同 v2 实现：固定定位、rAF 跟随、2s 静默 fading） */
body.presenting { cursor: pointer; }
body.presenting .deck-bar, body.presenting .deck-menu,
body.presenting .nav-dots, body.presenting .deck-progress,
body.presenting .deck-sidebar { opacity: 0; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .2s !important; }
}
```

## JS 引擎（DeckPlayer v3，逐字使用）

```js
const DECK_GAP = 24;   // 浏览模式页间距（须与 CSS .slide margin-bottom 一致）

class DeckPlayer {
    constructor() {
        this.stageEl = document.getElementById('deckStage');
        this.fitEl = document.getElementById('deckFit');
        this.slides = [...this.fitEl.querySelectorAll('section.slide')];
        this.current = 0; this.mode = 'browse'; this.presenting = false; this.cursorOn = false;
        this.endArm = false; this.scale = 1;
        this.wheelAcc = 0; this.wheelQuiet = null;
        this.hideTimer = null; this.rafId = null; this.scrollRaf = null;
        this.mx = -200; this.my = -200; this.cx = -200; this.cy = -200;
        this.buildDots(); this.buildThumbs(); this.applyMode(); this.applyCurrent(0); this.syncChrome();
        addEventListener('resize', () => this.fit());
        this.bindKeys(); this.bindWheel(); this.bindScroll(); this.bindClick(); this.bindPresent(); this.bindCursor();
        document.getElementById('deckMenu')?.addEventListener('click', () => this.toggleToc());
        document.getElementById('tocClose')?.addEventListener('click', () => this.closeToc());
        this.flashHint('playerHint', '滚动浏览 · ←→ 定位 · F 放映 · P 聚光灯', 4000);
    }

    pitch() { return 1080 * this.scale + DECK_GAP; }

    /* 缩放：放映=居中 letterbox；浏览=左上原点 + margin 补偿 transform 不参与布局的滚动高度 */
    fit() {
        this.scale = Math.min(innerWidth / 1920, innerHeight / 1080);
        this.fitEl.style.transform = `scale(${this.scale})`;
        if (this.mode === 'browse') {
            this.fitEl.style.transformOrigin = 'top left';
            this.fitEl.style.marginLeft = Math.max(0, (innerWidth - 1920 * this.scale) / 2) + 'px';
            const flowH = this.slides.length * 1080 + (this.slides.length - 1) * DECK_GAP;
            this.fitEl.style.marginBottom = (flowH * this.scale - flowH) + 'px';  // 负值收账，滚动高度=视觉高度
            this.stageEl.scrollTop = this.current * this.pitch();
        } else {
            this.fitEl.style.transformOrigin = 'center center';
            this.fitEl.style.marginLeft = '';
            this.fitEl.style.marginBottom = '';
        }
    }

    applyMode() {
        document.body.classList.toggle('browse', this.mode === 'browse');
        document.body.classList.toggle('presenting', this.mode === 'present');
        this.fit();
        if (this.mode === 'browse') this.stageEl.scrollTop = this.current * this.pitch();
    }

    applyCurrent(i) { this.slides.forEach((s, k) => s.classList.toggle('current', k === i)); }
    syncChrome() {
        document.getElementById('progressBar').style.width = ((this.current + 1) / this.slides.length * 100) + '%';
        document.getElementById('deckPage').textContent = `${this.current + 1} / ${this.slides.length}`;
        const mp = document.getElementById('deckMenuPage');
        if (mp) mp.textContent = `${this.current + 1}/${this.slides.length}`;
        this.dots?.forEach((d, k) => d.classList.toggle('active', k === this.current));
        this.thumbs?.forEach((t, k) => t.classList.toggle('active', k === this.current));
    }

    buildDots() { /* 同 v2：N 个 dot（含封面），click → show(i) */ }
    buildThumbs() { /* 同 v2：DOM 克隆 .thumb-page，click → show(i)+closeToc() */ }
    toggleToc() { /* 同 v2 */ }
    closeToc() { /* 同 v2 */ }

    /* 显式导航：放映=切 .current；浏览=平滑滚动到页首（滚动事件回收 current） */
    show(i) {
        i = Math.max(0, Math.min(this.slides.length - 1, i));
        if (this.mode === 'present') {
            if (i === this.current && this.slides[i].classList.contains('current')) return; // 同页重入护栏（末页循环 bug）
            this.current = i;
            this.applyCurrent(i);
            if (this.presenting) this.slides[i].querySelectorAll('.shown').forEach(e => e.classList.remove('shown'));
        } else {
            this.current = i;
            this.stageEl.scrollTo({ top: i * this.pitch(), behavior: 'smooth' });
        }
        this.syncChrome();
    }

    /* 放映：reveal 步进，末页放完 → 两次确认退出；浏览：页级定位 */
    step() {
        if (this.presenting) {
            const hidden = this.slides[this.current].querySelectorAll('.reveal:not(.shown)');
            if (hidden.length) { hidden[0].classList.add('shown'); this.endArm = false; return; }
            if (this.current < this.slides.length - 1) { this.show(this.current + 1); this.endArm = false; return; }
            if (!this.endArm) { this.endArm = true; this.flashHint('playerHint', '已是最后一页 · 再按一次结束放映', 2600); return; }
            this.endArm = false;
            this.endPresent();
            this.flashHint('playerHint', '放映结束', 2200);
            return;
        }
        if (this.current < this.slides.length - 1) { this.show(this.current + 1); this.endArm = false; }
        else this.flashHint('playerHint', '已是最后一页', 1800);
    }
    back() {
        this.endArm = false;
        if (this.presenting) {
            const shown = this.slides[this.current].querySelectorAll('.shown');
            if (shown.length) { shown[shown.length - 1].classList.remove('shown'); return; }
            if (this.current > 0) { this.show(this.current - 1); return; }
            this.flashHint('playerHint', '已是第一页', 1800);
            return;
        }
        if (this.current > 0) this.show(this.current - 1);
        else this.flashHint('playerHint', '已是第一页', 1800);
    }

    bindKeys() {
        document.addEventListener('keydown', e => {
            if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
            if (e.key === 'Escape') { this.closeToc(); return; }
            if (e.key === 'f' || e.key === 'F') { this.togglePresent(); return; }
            if (e.key === 'p' || e.key === 'P') { this.toggleCursor(); return; }
            if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); this.step(); }
            else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); this.back(); }
            else if (e.key === 'Home') { e.preventDefault(); this.show(0); }
            else if (e.key === 'End') { e.preventDefault(); this.show(this.slides.length - 1); }
        });
    }

    /* 滚轮：浏览=原生无缝滚动（不接管）；放映=逐页手势（48px 累积 + 180ms 静默过滤触控板惯性） */
    bindWheel() {
        addEventListener('wheel', e => {
            if (!this.presenting || e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            clearTimeout(this.wheelQuiet);
            this.wheelAcc += e.deltaY;
            this.wheelQuiet = setTimeout(() => {
                if (Math.abs(this.wheelAcc) >= 48) this.wheelAcc > 0 ? this.step() : this.back();
                this.wheelAcc = 0;
            }, 180);
        }, { passive: false });
    }

    /* 浏览模式滚动 → 回收当前页（rAF 节流）；applyCurrent 保持 .current 供工具/引擎判页 */
    bindScroll() {
        this.stageEl.addEventListener('scroll', () => {
            if (this.mode !== 'browse' || this.scrollRaf) return;
            this.scrollRaf = requestAnimationFrame(() => {
                this.scrollRaf = null;
                const i = Math.max(0, Math.min(this.slides.length - 1, Math.round(this.stageEl.scrollTop / this.pitch())));
                if (i !== this.current) { this.current = i; this.applyCurrent(i); this.syncChrome(); }
            });
        }, { passive: true });
    }

    bindClick() { /* 同 v2：仅放映态单击推进，交互元素豁免 */ }

    togglePresent() {
        if (this.presenting) { this.endPresent(); return; }
        this.mode = 'present'; this.presenting = true; this.endArm = false;
        this.applyMode();
        this.applyCurrent(this.current);
        this.slides[this.current].querySelectorAll('.shown').forEach(el => el.classList.remove('shown'));
        document.documentElement.requestFullscreen?.().catch(() => {});   // 被拒（iframe/无手势）仍保持放映 chrome
        this.flashHint('playerHint', '放映中 · →/单击 逐条推进 · F 退出', 3000);
    }
    endPresent() {
        this.mode = 'browse'; this.presenting = false; this.endArm = false;
        document.body.classList.remove('presenting');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        this.applyMode();   // 回浏览长页，停在原页
    }
    bindPresent() {
        document.getElementById('presentBtn')?.addEventListener('click', () => this.togglePresent());
    }

    bindCursor() { /* 同 v2：mousemove 记录、rAF lerp 跟随、2s 静默 fading */ }
    toggleCursor() { /* 同 v2 */ }
    flashHint(id, text, dur) { /* 同 v2 */ }
}
new DeckPlayer();
```

## 行为要点（改动前必读）

- **双模式布局靠 body 类切换**：`body.browse`（长页堆叠 + stage 滚动）vs `body.presenting`（单页 letterbox + 步进）；放映态同时隐藏全部 chrome。
- **浏览滚动高度补偿**：transform 不参与布局，浏览模式用 `marginBottom = flowH×(scale−1)` 把滚动高度收账到视觉高度——删掉它滚动条会长出一截。
- **滚动回收 current**：浏览模式滚动事件 rAF 节流算页，`applyCurrent` 保持 `.current` 类（CSS 在 browse 下不用它控制可见性，但工具与 e2e 靠它判页）。
- **同页重入护栏**：放映态 `show()` 对同页直接返回——否则末页再按 → 触发"进页清空 .shown"无限重演（2026-09-22 用户报告 bug）。
- **末页语义**：放映节拍放完再按 → → 第一次武装提示，第二次 `endPresent()` 停在末页回浏览。
- **缩略图 = DOM 克隆**（去 `.slide` 类、剥 id、`.thumb-page` 自足样式 + reveal 强制最终态）；Esc 关侧栏。
- **工具侧契约**：measure_overflow / shot 注入强制 CSS（stage 静态化 + fit 取缩放与 margin + 页全显 + chrome 隐藏），见脚本内注释。
