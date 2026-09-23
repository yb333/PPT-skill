/* =====================================================================
   deck-studio 效果基建 · stepfx.js
   步进程序（DECK_STEPS）执行器：分块 / 走查联动 / 脉冲 / 巡游（含闸门停顿）。
   用法：
     1. 前置：player 壳（DeckPlayer 类 + window.__deck + syncChrome 内派发 deckpage 事件）
     2. 本文件整体粘贴到 deck 脚本内、`new DeckPlayer()` 之后（mixin 挂到原型）
     3. 作者只声明 window.DECK_STEPS 数据（格式见 references/animation.md），不改引擎
   提取自参考实现 docs/emp/agent-concept_deck-studio.html（已验证）。
   工程警告：fx 元素缓存属性勿与方法同名（fxToken 属性/方法冲突曾致巡游卡死，令名 newToken）。
   ===================================================================== */
Object.assign(DeckPlayer.prototype, {
    /* 放映态 step() 顶部必须先调用本钩子（返回 true = 本次点击已被程序消费）：
       if (this.programStep && this.programStep()) return;                              */
    programStep() {
        if (this.tourWait) { const r = this.tourResolve; this.tourWait = false; this.busy = true; if (r) r(); return true; }
        if (this.tourActive) { this.tourSkip = true; return true; }
        if (this.busy) { this.seqSkip = true; return true; }      // 动画进行中：点击=快进当前序列
        const label = this.slides[this.current].dataset.label;
        if (this.progLabel !== label) {
            this.progLabel = label;
            this.prog = (window.DECK_STEPS || {})[label] || null;
            this.pi = 0;
            if (this.prog) {                                       // 结论条遮盖：自动置位，不消耗点击
                while (this.prog[this.pi] && this.prog[this.pi][0] === 'sumhide') {
                    this.runAction(this.prog[this.pi]); this.pi++;
                }
            }
        }
        if (!this.prog) return false;
        if (this.pi >= this.prog.length) return false;
        const a = this.prog[this.pi++];
        this.busy = true;
        Promise.resolve(this.runAction(a)).then(() => { this.busy = false; });
        return true;
    },
    /* 换页 / 退出放映时调用：清 fx、重置程序指针（终态不变式） */
    initProgram() {
        this.prog = null; this.progLabel = null; this.pi = 0;
        this.tourActive = false; this.tourWait = false; this.tourSkip = false;
        this.clearFx();
    },
    clearFx() {
        if (this.fxRaf) { cancelAnimationFrame(this.fxRaf); this.fxRaf = null; }
        if (this.fx) this.fx.remove();
        this.fx = null; this.fxSvg = null; this.fxToken = null; this.fxVeilEl = null;
        this.walkEl = null; this.walkEl2 = null; this.gateEl = null; this.sumCoverEl = null; this.seqSkip = false;
    },
    fxLayer() {
        const svg = this.slides[this.current].querySelector('svg');
        if (!svg) return null;
        if (!this.fx || this.fxSvg !== svg) {
            this.fx = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.fx.setAttribute('class', 'fx-layer');
            svg.appendChild(this.fx);
            this.fxSvg = svg;
        }
        return this.fx;
    },
    fxEl(tag, attrs, cls) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const k in attrs) el.setAttribute(k, attrs[k]);
        if (cls) el.setAttribute('class', cls);
        if (this.fx) this.fx.appendChild(el);   // 无层（页面已切走）时返回游离节点，不致崩溃
        return el;
    },
    wait(ms) { return new Promise(r => setTimeout(r, ms)); },
    async runAction(a) {
        const fx = this.fxLayer();
        if (!fx) return;
        const kind = a[0];
        if (kind === 't') return this.runTour(a[1]);
        if (kind === 'w') {                                   // 走查（多区域 = 联动），上次自动退回
            if (this.walkEl) this.walkEl.remove();
            if (this.walkEl2) this.walkEl2.remove();
            const r = a[1];
            this.walkEl = this.fxEl('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 8, class: 'fx-lit' });
            if (a[2]) this.walkEl2 = this.fxEl('rect', { x: a[2][0], y: a[2][1], width: a[2][2], height: a[2][3], rx: 8, class: 'fx-lit' });
            await this.wait(140);
            return;
        }
        if (kind === 'c') {                                   // 分块：将 .reveal 元素标记为已放出
            for (let i = 1; i < a.length; i++)
                document.querySelectorAll(a[i]).forEach(el => el.classList.add('shown'));
            await this.wait(140);
            return;
        }
        if (kind === 'pulse') {                               // 一次性点名脉冲
            const r = a[1];
            const el = this.fxEl('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 10, class: 'fx-pulse' });
            await this.wait(950);
            el.remove();
            return;
        }
        if (kind === 'sumhide') {                             // 结论条遮盖（自动置位）
            const r = a[1];
            this.sumCoverEl = this.fxEl('rect', { x: r[0], y: r[1], width: r[2], height: r[3], class: 'fx-sumcover on' });
            return;
        }
        if (kind === 'sumshow') {                             // 结论揭示（末拍）
            if (this.sumCoverEl) {
                this.sumCoverEl.classList.remove('on');
                await this.wait(520);
                this.sumCoverEl.remove(); this.sumCoverEl = null;
            }
            return;
        }
        if (kind === 'wseq') {                                // 自动连播走查：逐个点亮，点击=全部立即点亮
            const els = a[1].map(r => this.fxEl('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 8, class: 'fx-lit', opacity: 0 }));
            const iv = a[2] || 900;
            for (let i = 0; i < els.length; i++) {
                els[i].style.opacity = 1;
                await this.wait(iv);
                if (this.seqSkip) { els.forEach(e => { e.style.opacity = 1; }); break; }
            }
            return;
        }
    },
    async runTour(micros) {
        this.tourActive = true; this.tourSkip = false;
        for (const m of micros) {
            if (this.tourSkip && m[0] !== 'gate') { this.skipMicro(m); continue; }
            switch (m[0]) {
                case 'veil': this.fxVeil(m[1]); await this.wait(420); break;
                case 'lit': this.fxGlow(m[1], 'fx-lit'); await this.wait(160); break;
                case 'state': this.fxGlow(m[1], 'fx-state'); await this.wait(160); break;
                case 'move': await this.fly(m[1], m[2], m[3], m[4], m[5] || 550, '#2563eb'); break;
                case 'move2': await this.fly2(m[1], m[2], m[3], m[4], m[5], m[6] || 700); break;
                case 'back': await this.fly(m[1], m[2], m[3], m[4], m[5] || 480, '#ef4444'); break;
                case 'pulse': { const el = this.fxEl('rect', { x: m[1][0], y: m[1][1], width: m[1][2], height: m[1][3], rx: 10, class: 'fx-pulse' }); await this.wait(900); el.remove(); break; }
                case 'gate': if (this.tourSkip) break; await this.waitGate(m[1], m[2]); break;
            }
        }
        this.tourActive = false; this.tourSkip = false;
        await this.endTour();
    },
    skipMicro(m) {
        if (m[0] === 'veil') { this.fxVeil(m[1]); this.fxVeilEl.classList.add('on'); }
        else if (m[0] === 'lit') this.fxGlow(m[1], 'fx-lit');
        else if (m[0] === 'state') this.fxGlow(m[1], 'fx-state');
    },
    fxVeil(rect) {
        if (!this.fxVeilEl) this.fxVeilEl = this.fxEl('rect', { x: rect[0], y: rect[1], width: rect[2], height: rect[3], rx: 10, class: 'fx-veil' });
        requestAnimationFrame(() => this.fxVeilEl.classList.add('on'));
    },
    fxGlow(rect, cls) {
        this.fxEl('rect', { x: rect[0], y: rect[1], width: rect[2], height: rect[3], rx: 8, class: cls });
    },
    newToken(color) {
        if (!this.fxToken) this.fxToken = this.fxEl('circle', { r: 9, fill: color, opacity: .95, stroke: '#fff', 'stroke-width': 2 });
        this.fxToken.setAttribute('fill', color);
        this.fxToken.setAttribute('opacity', .95);
        return this.fxToken;
    },
    fly(x1, y1, x2, y2, dur, color) {
        return new Promise(res => {
            const token = this.newToken(color);
            const t0 = performance.now();
            const tick = now => {
                if (!this.tourActive) { res(); return; }
                const k = this.tourSkip ? 1 : Math.min(1, (now - t0) / dur);
                const e = 1 - Math.pow(1 - k, 3);
                token.setAttribute('cx', x1 + (x2 - x1) * e);
                token.setAttribute('cy', y1 + (y2 - y1) * e);
                if (k < 1) this.fxRaf = requestAnimationFrame(tick); else res();
            };
            this.fxRaf = requestAnimationFrame(tick);
        });
    },
    fly2(ax, ay, bx, by, tx, ty, dur) {                      // 双光点汇合（并行语义）
        return new Promise(res => {
            const ta = this.fxEl('circle', { r: 8, fill: '#f59e0b', opacity: .95, stroke: '#fff', 'stroke-width': 2 });
            const tb = this.fxEl('circle', { r: 8, fill: '#f59e0b', opacity: .95, stroke: '#fff', 'stroke-width': 2 });
            const t0 = performance.now();
            const tick = now => {
                if (!this.tourActive) { ta.remove(); tb.remove(); res(); return; }
                const k = this.tourSkip ? 1 : Math.min(1, (now - t0) / dur);
                const e = 1 - Math.pow(1 - k, 3);
                ta.setAttribute('cx', ax + (tx - ax) * e); ta.setAttribute('cy', ay + (ty - ay) * e);
                tb.setAttribute('cx', bx + (tx - bx) * e); tb.setAttribute('cy', by + (ty - by) * e);
                if (k < 1) this.fxRaf = requestAnimationFrame(tick); else { ta.remove(); tb.remove(); res(); }
            };
            this.fxRaf = requestAnimationFrame(tick);
        });
    },
    waitGate(x, y) {                                         // 闸口：语义性暂停（点击=确认），先推进路由索引
        this.gateEl = this.fxEl('circle', { cx: x, cy: y, r: 16 }, 'fx-gate');
        this.flashHint('playerHint', '单击确认，继续', 1600);
        this.tourWait = true;
        this.busy = false;
        return new Promise(res => { this.tourResolve = () => { if (this.gateEl) { this.gateEl.remove(); this.gateEl = null; } res(); }; });
    },
    async endTour() {
        if (this.fxVeilEl) { this.fxVeilEl.classList.remove('on'); await this.wait(450); }
        if (this.fxToken) this.fxToken.setAttribute('opacity', 0);
        await this.wait(200);
        this.clearFx();
    },
});
