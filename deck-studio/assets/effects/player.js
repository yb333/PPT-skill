/* =====================================================================
   deck-studio 效果基建 · player.js — DeckPlayer 核心类（唯一源）
   ---------------------------------------------------------------------
   本文件是所有 deck 引擎的唯一源；deck 内的引擎块由 scripts/sync-engine.mjs
   从 assets/effects/ 四件套（player.js + stepfx.js + auto.js + ambient.js）
   生成，标记为 ═══ DECK ENGINE:BEGIN/END ═══。改引擎一律改这里再同步，
   严禁在 deck 内手改引擎块——多副本必然漂移。

   player 壳 DOM 契约（完整标记见模板 assets/templates/yunshan.html）：
     必需  #deckStage > #deckFit > section.slide×N（每页 data-label 必填）
     必需  #deckBar：#progressBar #deckPage #presentBtn #deckMenu
     可选  #deckSidebar > #deckThumbs + #tocClose（缩略图目录）
     可选  #presCursor / #presCursorHint（聚光灯光标，无则 P 键不启用）
     可选  #playerHint / #presCursorHint（提示条，flashHint 已判空）
   配置（deck 数据区声明，引擎只读）：
     const DECK_GAP = 24            页间隙，缺省 24
   混合层（stepfx.js/auto.js/ambient.js）依赖：window.__deck、syncChrome
   内派发 deckpage 事件、data-label 页标识。本文件声明版本号供门禁断言。
   ===================================================================== */
window.DECK_ENGINE_VERSION = '1.4.0';

class DeckPlayer {
    constructor() {
        this.stageEl = document.getElementById('deckStage');
        this.fitEl = document.getElementById('deckFit');
        this.slides = [...this.fitEl.querySelectorAll('section.slide')];
        this.current = 0; this.mode = 'browse'; this.presenting = false; this.cursorOn = false;
        this.endArm = false; this.scale = 1;
        this.wheelAcc = 0; this.wheelQuiet = null; this.scrollRaf = null;
        this._scrollTarget = null; this._scrollSetAt = 0;   // 程序触发的平滑滚动守卫（见 bindScroll）
        this.hideTimer = null; this.rafId = null;
        this.mx = -200; this.my = -200; this.cx = -200; this.cy = -200;
        this.buildThumbs(); this.applyMode(); this.applyCurrent(0); this.syncChrome();
        addEventListener('resize', () => this.fit());
        this.bindKeys(); this.bindWheel(); this.bindScroll(); this.bindClick(); this.bindPresent();
        if (document.getElementById('presCursor')) this.bindCursor();   // 聚光灯是可选件
        document.getElementById('deckMenu')?.addEventListener('click', () => this.toggleToc());
        document.getElementById('tocClose')?.addEventListener('click', () => this.closeToc());
        this.flashHint('playerHint', this.bootHint(), 4000);
    }
    bootHint() {
        const parts = ['滚动浏览 · ←→ 定位', 'F 放映'];
        if (document.getElementById('presCursor')) parts.push('P 聚光灯');
        return parts.join(' · ');
    }
    gap() { return (typeof DECK_GAP !== 'undefined' && Number.isFinite(DECK_GAP)) ? DECK_GAP : 24; }
    pitch() { return 1080 * this.scale + this.gap(); }
    fit() {
        this.scale = Math.min(innerWidth / 1920, innerHeight / 1080);
        this.fitEl.style.transform = `scale(${this.scale})`;
        if (this.mode === 'browse') {
            this.fitEl.style.transformOrigin = 'top left';
            this.fitEl.style.marginLeft = Math.max(0, (innerWidth - 1920 * this.scale) / 2) + 'px';
            const flowH = this.slides.length * 1080 + (this.slides.length - 1) * this.gap();
            this.fitEl.style.marginBottom = (flowH * this.scale - flowH) + 'px';
            this.stageEl.scrollTop = this.current * this.pitch();
        } else {
            this.fitEl.style.transformOrigin = 'center center';
            this.fitEl.style.marginLeft = '';
            this.fitEl.style.marginBottom = '';
        }
    }
    applyMode() {
        this._scrollTarget = null;                      // 模式切换：滚动守卫失效
        document.body.classList.toggle('browse', this.mode === 'browse');
        document.body.classList.toggle('presenting', this.mode === 'present');
        this.fit();
        if (this.mode === 'browse') this.stageEl.scrollTop = this.current * this.pitch();
    }
    applyCurrent(i) { this.slides.forEach((s, k) => s.classList.toggle('current', k === i)); }
    syncChrome() {
        document.dispatchEvent(new CustomEvent('deckpage'));
        const pb = document.getElementById('progressBar');
        if (pb) pb.style.width = ((this.current + 1) / this.slides.length * 100) + '%';
        const pg = document.getElementById('deckPage');
        if (pg) pg.textContent = `${this.current + 1} / ${this.slides.length}`;
        this.thumbs?.forEach((t, k) => t.classList.toggle('active', k === this.current));
    }
    buildThumbs() {
        const wrap = document.getElementById('deckThumbs');
        if (!wrap) { this.thumbs = []; return; }
        this.thumbs = this.slides.map((s, i) => {
            const item = document.createElement('div');
            item.className = 'thumb-item';
            const clone = s.cloneNode(true);
            clone.classList.remove('slide');
            clone.classList.add('thumb-page');
            clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            const box = document.createElement('div');
            box.className = 'thumb-box';
            const inner = document.createElement('div');
            inner.className = 'thumb-inner';
            inner.appendChild(clone);
            box.appendChild(inner);
            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = `${i + 1}. ${s.dataset.label || ''}`;
            item.append(box, label);
            item.addEventListener('click', () => this.show(i));   // 跳页但保持侧栏打开，便于连续预览
            wrap.appendChild(item);
            return item;
        });
    }
    toggleToc() {
        const sb = document.getElementById('deckSidebar');
        if (!sb || !this.thumbs?.length) return;
        sb.classList.toggle('open');
        if (sb.classList.contains('open')) this.thumbs[this.current]?.scrollIntoView({ block: 'nearest' });
        this.thumbs.forEach((t, k) => t.classList.toggle('active', k === this.current));
    }
    closeToc() { document.getElementById('deckSidebar')?.classList.remove('open'); }
    show(i) {
        i = Math.max(0, Math.min(this.slides.length - 1, i));
        if (this.mode === 'present') {
            if (i === this.current && this.slides[i].classList.contains('current')) return;
            this.current = i;
            this.applyCurrent(i);
            if (this.initProgram) this.initProgram();
            if (this.presenting) this.slides[i].querySelectorAll('.shown').forEach(e => e.classList.remove('shown'));
        } else {
            this.current = i;
            this.applyCurrent(i);                       // 目标页即时生效：不依赖滚动事件补给（无头/节流环境可能不派发）
            this._scrollTarget = i * this.pitch();      // 跨页平滑滚动：途中中间位置不是用户意图，
            this._scrollSetAt = performance.now();      // bindScroll 在到站/超时前不改 current（否则 auto 序列被 stale 误杀）
            this.stageEl.scrollTo({ top: i * this.pitch(), behavior: 'smooth' });
        }
        this.syncChrome();
    }
    step() {
        if (this.presenting) {
            if (this.programStep && this.programStep()) return;  // 申报程序优先（animation.md）
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
            if ((e.key === 'p' || e.key === 'P') && document.getElementById('presCursor')) { this.toggleCursor(); return; }
            if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); this.step(); }
            else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); this.back(); }
            else if (e.key === 'Home') { e.preventDefault(); this.show(0); }
            else if (e.key === 'End') { e.preventDefault(); this.show(this.slides.length - 1); }
        });
    }
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
    bindScroll() {
        this.stageEl.addEventListener('scroll', () => {
            if (this.mode !== 'browse' || this.scrollRaf) return;
            this.scrollRaf = requestAnimationFrame(() => {
                this.scrollRaf = null;
                if (this._scrollTarget != null) {        // 程序触发的平滑滚动途中：忽略中间位置（目录远跳防串页）
                    const settled = Math.abs(this.stageEl.scrollTop - this._scrollTarget) < 4;
                    if (!settled && performance.now() - this._scrollSetAt < 1200) return;
                    if (settled) this._scrollTarget = null;   // 超时则恢复跟随（用户手动滚动打断的情形）
                }
                const i = Math.max(0, Math.min(this.slides.length - 1, Math.round(this.stageEl.scrollTop / this.pitch())));
                if (i !== this.current) { this.current = i; this.applyCurrent(i); this.syncChrome(); }
            });
        }, { passive: true });
    }
    bindClick() {
        document.addEventListener('click', e => {
            const sb = document.getElementById('deckSidebar');
            if (sb?.classList.contains('open') && !e.target.closest('.deck-sidebar, .deck-menu')) { this.closeToc(); return; } // 点侧栏外即关闭
            if (!this.presenting) return;
            if (e.target.closest('a,button,input,textarea,select,.deck-bar,.deck-menu,.nav-dots,.deck-sidebar')) return;
            this.step();
        });
    }
    togglePresent() {
        if (this.presenting) { this.endPresent(); return; }
        this.mode = 'present'; this.presenting = true; this.endArm = false;
        this.applyMode();
        this.show(0);                                        // 从头播放：恒自封面起
        if (this.initProgram) this.initProgram();
        this.slides[0].querySelectorAll('.shown').forEach(el => el.classList.remove('shown'));
        document.documentElement.requestFullscreen?.().catch(() => {})
        this.flashHint('playerHint', '放映中 · →/单击 逐条推进 · F 退出', 3000);
    }
    endPresent() {
        this.mode = 'browse'; this.presenting = false; this.endArm = false;
        document.body.classList.remove('presenting');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        this.applyMode();
        if (this.initProgram) this.initProgram();
    }
    bindPresent() {
        document.getElementById('presentBtn')?.addEventListener('click', () => this.togglePresent());
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.presenting) this.endPresent();   // Esc 退全屏 = 同步退放映
        });
    }
    bindCursor() {
        this.cursor = document.getElementById('presCursor');
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
        el.textContent = text; el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), dur || 2000);
    }
}
