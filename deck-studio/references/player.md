# player.md — 舞台框架与双模式播放器（决策 D7：打开就像 PPT）

**每个 deck 必含。** 固定 1920×1080 画布缩放适配窗口，零滚动零 IO，换页是显式 `show(i)`。双模式：**浏览**（默认，带界面框架，reveal 全显供阅读）+ **放映**（全屏，reveal 节拍步进）。

与工具的契约（measure_overflow / shot 会注入强制 CSS 并隐藏杂物）——**类名不可改**：
`.deck-stage` / `.deck-fit` / `.deck-bar` / `.deck-progress` / `.nav-dots` / `.pres-cursor` / `.pres-cursor-hint` / `.player-hint`；页元素 `section.slide[data-label]`；渐显 `.reveal`；步进标记 `.shown`；放映态 `body.presenting`。

## HTML（固定结构）

```html
<div class="deck-stage">
  <div class="deck-fit" id="deckFit">
    <section class="slide" data-label="封面">…</section>
    <!-- × N，每页 1920×1080，px 排版 -->
  </div>
</div>

<div class="deck-progress"><div id="progressBar"></div></div>
<nav class="nav-dots" id="navDots" aria-label="页面导航"></nav>
<header class="deck-bar" id="deckBar">
  <span class="deck-page" id="deckPage">1 / 6</span>
  <button class="deck-present-btn" id="presentBtn" title="放映模式 (F)">▶ 放映</button>
</header>
<div class="pres-cursor" id="presCursor"><div class="pres-spotlight"></div><div class="pres-dot"></div></div>
<div class="pres-cursor-hint" id="presCursorHint">按 P 开关演示光标</div>
<div class="player-hint" id="playerHint">←→ 翻页 · F 放映 · P 聚光灯</div>
```

## CSS

```css
html, body { height: 100%; margin: 0; overflow: hidden; }  /* 零滚动：白页 bug 的结构性免疫 */
body { background: #e8eaf0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }

/* 舞台：画布居中 letterbox */
.deck-stage { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.deck-fit {
    width: 1920px; height: 1080px; flex: 0 0 auto;
    position: relative; overflow: hidden; background: #fff;
    box-shadow: 0 12px 48px rgba(15,23,42,.18); border-radius: 8px;
    transform-origin: center center;   /* JS 设 scale */
}

/* 页：叠放，显式换页（不用 display:none——保布局，门禁可直接测量） */
.slide {
    position: absolute; inset: 0; width: 1920px; height: 1080px;
    padding: 56px 90px; display: flex; flex-direction: column;
    overflow: hidden; background: #fff;
    visibility: hidden; opacity: 0;
    transition: opacity .35s ease, visibility 0s linear .35s;
}
.slide.current { visibility: visible; opacity: 1; transition: opacity .35s ease; }

/* 渐显（通用层）；浏览模式全显，放映模式按 .shown 节拍放出 */
.reveal { opacity: 0; transform: translateY(18px);
    transition: opacity .5s var(--ease-out-expo, cubic-bezier(.16,1,.3,1)), transform .5s var(--ease-out-expo, cubic-bezier(.16,1,.3,1)); }
.slide.current .reveal { opacity: 1; transform: none; }
body.presenting .slide.current .reveal:not(.shown) { opacity: 0 !important; transform: translateY(18px) !important; }

/* 进度条 / nav dots / 页码工具条 */
.deck-progress { position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 100; background: rgba(15,23,42,.08); }
#progressBar { height: 100%; width: 0%; background: linear-gradient(90deg, var(--c-info), var(--c-exec)); transition: width .4s ease; }
.nav-dots { position: fixed; right: 14px; top: 50%; transform: translateY(-50%); z-index: 100; display: flex; flex-direction: column; gap: 7px; }
.nav-dot { width: 7px; height: 7px; border-radius: 50%; background: #b6bdc9; cursor: pointer; transition: all .3s ease; }
.nav-dot.active { background: var(--c-exec); transform: scale(1.5); }
.nav-dot:hover { background: var(--c-exec); }
.deck-bar {
    position: fixed; top: 14px; right: 16px; z-index: 110;
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,.72); backdrop-filter: blur(12px);
    border: 1px solid rgba(226,232,240,.9); border-radius: 999px; padding: 7px 9px 7px 16px;
    box-shadow: 0 4px 16px rgba(15,23,42,.08);
    font-size: 13px; color: var(--text-sub, #64748b);
    transition: opacity .4s ease;
}
.deck-page { font-variant-numeric: tabular-nums; letter-spacing: .06em; }
.deck-present-btn {
    border: none; cursor: pointer; border-radius: 999px; padding: 6px 14px;
    background: var(--c-exec, #2563eb); color: #fff; font-size: 13px; font-weight: 600;
}
.deck-present-btn:hover { filter: brightness(1.08); }

/* 聚光灯光标与提示 chip（同前版，略）：
   .pres-cursor/.pres-spotlight/.pres-dot/.pres-cursor-hint/.player-hint 样式见上一版实现，不变 */

/* 放映态：界面框架淡出 */
body.presenting .deck-bar, body.presenting .nav-dots, body.presenting .deck-progress { opacity: 0; pointer-events: none; }
body.presenting { cursor: pointer; }

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .2s !important; }
}
```

## JS 引擎（DeckPlayer，逐字使用）

```js
class DeckPlayer {
    constructor() {
        this.fitEl = document.getElementById('deckFit');
        this.slides = [...this.fitEl.querySelectorAll('section.slide')];
        this.current = 0; this.presenting = false; this.cursorOn = false;
        this.wheelAcc = 0; this.wheelQuiet = null;
        this.buildDots(); this.fit(); this.show(0);
        addEventListener('resize', () => this.fit());
        this.bindKeys(); this.bindWheel(); this.bindClick(); this.bindPresent(); this.bindCursor();
        this.flashHint('playerHint', '←→ 翻页 · F 放映 · P 聚光灯', 4000);
    }

    /* 画布缩放：适配窗口，居中 */
    fit() {
        const s = Math.min(innerWidth / 1920, innerHeight / 1080);
        this.fitEl.style.transform = `scale(${s})`;
    }

    buildDots() {
        const nav = document.getElementById('navDots');
        this.slides.forEach((s, i) => {
            const d = document.createElement('div');
            d.className = 'nav-dot';
            d.title = s.dataset.label || `Slide ${i + 1}`;
            d.addEventListener('click', () => this.show(i));
            nav.appendChild(d);
        });
        this.dots = [...nav.children];
    }

    show(i) {
        i = Math.max(0, Math.min(this.slides.length - 1, i));
        this.slides[this.current].classList.remove('current');
        this.current = i;
        const s = this.slides[i];
        s.classList.add('current');
        if (this.presenting) s.querySelectorAll('.shown').forEach(e => e.classList.remove('shown')); // 进页重走节拍
        document.getElementById('progressBar').style.width = ((i + 1) / this.slides.length * 100) + '%';
        document.getElementById('deckPage').textContent = `${i + 1} / ${this.slides.length}`;
        this.dots.forEach((d, k) => d.classList.toggle('active', k === i));
    }

    /* 放映模式：reveal 步进；浏览模式：直接翻页 */
    step() {
        if (this.presenting) {
            const hidden = this.slides[this.current].querySelectorAll('.reveal:not(.shown)');
            if (hidden.length) { hidden[0].classList.add('shown'); return; }
        }
        this.show(this.current + 1);
    }
    back() {
        if (this.presenting) {
            const shown = this.slides[this.current].querySelectorAll('.shown');
            if (shown.length) { shown[shown.length - 1].classList.remove('shown'); return; }
        }
        this.show(this.current - 1);
    }

    bindKeys() {
        document.addEventListener('keydown', e => {
            if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
            if (e.key === 'f' || e.key === 'F') { this.togglePresent(); return; }
            if (e.key === 'p' || e.key === 'P') { this.toggleCursor(); return; }
            if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); this.step(); }
            else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); this.back(); }
            else if (e.key === 'Home') { e.preventDefault(); this.show(0); }
            else if (e.key === 'End') { e.preventDefault(); this.show(this.slides.length - 1); }
        });
    }

    /* 滚轮 = 逐页手势：48px 累积阈值 + 180ms 静默判定，过滤触控板惯性 */
    bindWheel() {
        addEventListener('wheel', e => {
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            clearTimeout(this.wheelQuiet);
            this.wheelAcc += e.deltaY;
            this.wheelQuiet = setTimeout(() => {
                if (Math.abs(this.wheelAcc) >= 48) this.wheelAcc > 0 ? this.step() : this.back();
                this.wheelAcc = 0;
            }, 180);
        }, { passive: false });
    }

    /* 放映态单击空白推进；交互元素豁免 */
    bindClick() {
        document.addEventListener('click', e => {
            if (!this.presenting) return;
            if (e.target.closest('a,button,input,textarea,select,[contenteditable],.deck-bar,.nav-dots')) return;
            this.step();
        });
    }

    togglePresent() {
        if (this.presenting) { this.endPresent(); return; }
        this.presenting = true;
        document.body.classList.add('presenting');
        this.slides[this.current].querySelectorAll('.shown').forEach(el => el.classList.remove('shown'));
        document.documentElement.requestFullscreen?.().catch(() => {});   // 被拒（iframe/无手势）仍保持放映 chrome
        this.flashHint('playerHint', '放映中 · →/单击 逐条推进 · F 退出', 3000);
    }
    endPresent() {
        this.presenting = false;
        document.body.classList.remove('presenting');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    bindPresent() {
        document.getElementById('presentBtn')?.addEventListener('click', () => this.togglePresent());
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.presenting) { this.presenting = false; document.body.classList.remove('presenting'); }
        });
    }

    /* 聚光灯光标（P 键）——实现同上一版：
       mousemove 记录目标、rAF lerp 跟随、2s 静默降为 fading；
       toggleCursor 切 body cursor none + hint 提示。完整代码见仓库历史版本/fixture。 */
    bindCursor() { /* …同前版实现… */ }
    toggleCursor() { /* …同前版实现… */ }

    flashHint(id, text, dur) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text; el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), dur || 2000);
    }
}
new DeckPlayer();
```

## 行为要点（改动前必读）

- **页切换 = visibility**，不用 display:none：非当前页保布局，门禁无需特殊处理即可测量（配合工具强制 CSS 更稳）。
- **滚轮被 preventDefault 接管**为逐页手势——这是"像 PPT"的关键；缩放类 Ctrl/Cmd+滚轮放行给浏览器。
- **放映进页清空 `.shown`**（重走节拍）；浏览模式 reveal 全显（阅读模式）。
- **全屏被拒时降级**为纯放映 chrome（iframe 嵌入、无手势调用场景仍可用）。
- 工具侧契约：measure_overflow / shot 注入强制 CSS（stage 静态化 + fit 取缩放 + 页全显），见脚本内注释。
