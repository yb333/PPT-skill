# player.md — 播放器壳标准实现（决策 D7：点开就像 PPT）

**每个 deck 必含。** 提供四件事：导航反馈（进度条 + nav dots）、演示光标（P 键聚光灯）、**全屏放映**（F 键）、**点击推进 + reveal 步进**（放映态）。普通模式 = 自适应滚动文档（浏览器原生滚动 + snap 翻页）；放映态 = 传统 PPT 体验。

与工具的契约（SKILL.md）：杂物类名 `.deck-progress` / `.nav-dots` / `.pres-cursor` / `.pres-cursor-hint` / `.player-hint`，验证与导出前会被隐藏——**类名不可改**。

## HTML（固定结构，逐字使用）

```html
<div class="deck-progress"><div id="progressBar"></div></div>
<nav class="nav-dots" id="navDots" aria-label="页面导航"></nav>
<div class="pres-cursor" id="presCursor">
    <div class="pres-spotlight"></div>
    <div class="pres-dot"></div>
</div>
<div class="pres-cursor-hint" id="presCursorHint">按 P 开关演示光标</div>
<div class="player-hint" id="playerHint">F 全屏放映 · ←→ 翻页 · P 聚光灯</div>
```

## CSS

```css
/* 进度条（顶部，token 化） */
.deck-progress {
    position: fixed; top: 0; left: 0; width: 100%; height: 3px;
    z-index: 100; background: var(--border-card);
}
#progressBar {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, var(--c-info), var(--c-exec));
    transition: width .4s ease;
}

/* Nav dots（右侧，第 1 页无 dot） */
.nav-dots {
    position: fixed; right: 12px; top: 50%; transform: translateY(-50%);
    z-index: 100; display: flex; flex-direction: column; gap: 6px;
}
.nav-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #cbd5e1; cursor: pointer; transition: all .3s ease;
}
.nav-dot.active { background: var(--c-info); transform: scale(1.5); }
.nav-dot:hover { background: var(--c-info); }

/* 演示光标（P 键开关） */
.pres-cursor {
    position: fixed; pointer-events: none; z-index: 9999;
    width: 0; height: 0; opacity: 0; transition: opacity .4s ease;
}
.pres-cursor.active { opacity: 1; }
.pres-cursor.fading .pres-spotlight { opacity: .04; }
.pres-cursor.fading .pres-dot { opacity: .4; }
.pres-spotlight {
    position: absolute; width: 220px; height: 220px; top: 50%; left: 50%;
    transform: translate(-50%,-50%); border-radius: 50%;
    background: radial-gradient(circle,
        color-mix(in srgb, var(--c-info) 16%, transparent) 0%,
        color-mix(in srgb, var(--c-info) 9%, transparent) 35%,
        color-mix(in srgb, var(--c-info) 3%, transparent) 60%,
        transparent 80%);
    opacity: .14; transition: opacity .6s ease;
}
.pres-dot {
    position: absolute; width: 8px; height: 8px; top: 50%; left: 50%;
    transform: translate(-50%,-50%); border-radius: 50%;
    background: var(--c-info);
    box-shadow: 0 0 8px color-mix(in srgb, var(--c-info) 50%, transparent);
    transition: opacity .6s ease;
}
.pres-cursor-hint, .player-hint {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    font-size: 12px; color: var(--text-faint);
    background: rgba(255,255,255,.9); padding: 6px 16px; border-radius: 20px;
    border: 1px solid var(--border-card); z-index: 9999;
    opacity: 0; transition: opacity .3s ease; pointer-events: none;
    white-space: nowrap;
}
.pres-cursor-hint.show, .player-hint.show { opacity: 1; }

/* ===== 放映态（body.presenting）===== */
body.presenting { cursor: pointer; }
body.presenting .nav-dots,
body.presenting .deck-progress { opacity: 0; pointer-events: none; }
/* 步进：本页 reveal 元素未标 .shown 前保持隐藏，点击/按键逐个放出 */
body.presenting .slide.visible [class*="reveal"]:not(.shown) {
    opacity: 0 !important;
    transform: translateY(30px) !important;
}
```

> 深色主题预设把 `.pres-cursor-hint/.player-hint` 的白底改为对应 token。

## JS 控制器（SlidePresentation，逐字使用）

```js
class SlidePresentation {
    constructor() {
        this.slides = [...document.querySelectorAll('section.slide')];
        this.current = 0;
        this.cursorOn = false;
        this.buildDots();
        this.observeSlides();
        this.trackScroll();
        this.bindKeys();
        this.bindClick();
        this.bindFullscreen();
        this.bindCursor();
        this.flashHint('playerHint', 'F 全屏放映 · ←→ 翻页 · P 聚光灯', 4000);
    }

    /* —— 导航反馈 —— */
    buildDots() {
        const nav = document.getElementById('navDots');
        // 第 1 页（封面）无 dot，从第 2 页开始
        for (let i = 1; i < this.slides.length; i++) {
            const d = document.createElement('div');
            d.className = 'nav-dot';
            d.title = this.slides[i].dataset.label || `Slide ${i + 1}`;
            d.addEventListener('click', () => this.go(i));
            nav.appendChild(d);
        }
        this.dots = [...nav.children];
    }
    sync() {
        const p = (this.current + 1) / this.slides.length * 100;
        document.getElementById('progressBar').style.width = p + '%';
        this.dots.forEach((d, i) => d.classList.toggle('active', i + 1 === this.current));
    }

    /* —— 渐显与当前页追踪（普通模式交给原生滚动+snap） —— */
    observeSlides() {
        const io = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('visible');
        }), { threshold: 0.4 });
        this.slides.forEach(s => io.observe(s));
    }
    trackScroll() {
        let raf = null;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = null;
                this.current = Math.max(0, Math.min(this.slides.length - 1,
                    Math.round(scrollY / innerHeight)));
                this.sync();
            });
        };
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* —— 翻页与步进 —— */
    go(i) {
        i = Math.max(0, Math.min(this.slides.length - 1, i));
        this.slides[i].scrollIntoView({ behavior: 'smooth' });
    }
    step() {          // → / Space / 单击：先逐个放出本页 reveal，放完再翻页
        const slide = this.slides[this.current];
        const hidden = slide ? slide.querySelectorAll('[class*="reveal"]:not(.shown)') : [];
        if (document.body.classList.contains('presenting') && hidden.length) {
            hidden[0].classList.add('shown');
            return;
        }
        this.go(this.current + 1);
    }
    back() {          // ← ：先逐个收回已步进的 reveal，收完再翻页
        const slide = this.slides[this.current];
        const shown = slide ? slide.querySelectorAll('.shown') : [];
        if (document.body.classList.contains('presenting') && shown.length) {
            shown[shown.length - 1].classList.remove('shown');
            return;
        }
        this.go(this.current - 1);
    }

    /* —— 全屏放映 —— */
    togglePresent() {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
    }
    bindFullscreen() {
        document.addEventListener('fullscreenchange', () => {
            const on = !!document.fullscreenElement;
            document.body.classList.toggle('presenting', on);
            document.querySelectorAll('.shown').forEach(e => e.classList.remove('shown'));
            this.go(this.current);
            this.flashHint('playerHint',
                on ? '放映中 · ←→ / 单击推进 · F 退出' : '已退出放映', 3000);
        });
    }

    /* —— 键盘：普通模式只接管 F/P，翻页交给原生滚动；放映态全面接管 —— */
    bindKeys() {
        document.addEventListener('keydown', e => {
            if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
            if (e.key === 'f' || e.key === 'F') { this.togglePresent(); return; }
            if (e.key === 'p' || e.key === 'P') { this.toggleCursor(); return; }
            if (!document.body.classList.contains('presenting')) return;
            if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)) {
                e.preventDefault(); this.step();
            } else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) {
                e.preventDefault(); this.back();
            } else if (e.key === 'Home') { e.preventDefault(); this.go(0); }
            else if (e.key === 'End') { e.preventDefault(); this.go(this.slides.length - 1); }
        });
    }

    /* —— 放映态单击空白推进（交互元素豁免） —— */
    bindClick() {
        document.addEventListener('click', e => {
            if (!document.body.classList.contains('presenting')) return;
            if (e.target.closest('a,button,input,textarea,select,[contenteditable],.nav-dots')) return;
            this.step();
        });
    }

    /* —— 演示光标（P 键） —— */
    bindCursor() {
        this.cursor = document.getElementById('presCursor');
        this.mx = -200; this.my = -200; this.cx = -200; this.cy = -200;
        this.hideTimer = null; this.rafId = null;
        document.addEventListener('mousemove', e => {
            this.mx = e.clientX; this.my = e.clientY;
            if (!this.cursorOn) return;
            this.cursor.classList.add('active');
            this.cursor.classList.remove('fading');
            clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(() => this.cursor.classList.add('fading'), 2000);
        });
    }
    toggleCursor() {
        this.cursorOn = !this.cursorOn;
        if (this.cursorOn) {
            document.body.style.cursor = 'none';
            this.cursor.classList.add('active');
            this.cursor.classList.remove('fading');
            this.rafId = requestAnimationFrame(() => this.cursorLoop());
            this.flashHint('presCursorHint', '演示光标已开启 · 按 P 关闭', 2000);
        } else {
            document.body.style.cursor = '';
            this.cursor.classList.remove('active', 'fading');
            cancelAnimationFrame(this.rafId);
            this.flashHint('presCursorHint', '演示光标已关闭', 1500);
        }
    }
    cursorLoop() {
        this.cx += (this.mx - this.cx) * .25;
        this.cy += (this.my - this.cy) * .25;
        this.cursor.style.left = this.cx + 'px';
        this.cursor.style.top = this.cy + 'px';
        if (this.cursorOn) this.rafId = requestAnimationFrame(() => this.cursorLoop());
    }

    flashHint(id, text, dur) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), dur || 2000);
    }
}
new SlidePresentation();
```

## 行为要点（改动前必读）

- **普通模式**浏览器原生滚动 + scroll-snap 已能 ←→/Space 翻页，控制器不重复接管（否则双步进）；只做进度/dot 同步与 F/P 热键。
- **放映态进入**时清空全部 `.shown` 并回到当前页——本页 reveal 从隐藏开始逐次放出，模拟 PPT 动画步进；退出放映恢复滚动模式全显。
- 步进/回退选择器用 `[class*="reveal"]`，覆盖 `reveal` / `reveal-scale` / `reveal-left` / `reveal-blur` 全家族（animation.md 词表）。
- `requestFullscreen` 需用户手势触发（F 键/点击入口均可）；Safari 老版本前缀问题交付时目检一次即可。
- 触摸设备：原生滚动即翻页；放映态点按即推进（bindClick 已覆盖）。
