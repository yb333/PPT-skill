/* =====================================================================
   deck-studio 效果基建 · auto.js — A 型自动连播调度器（唯一源）
   ---------------------------------------------------------------------
   A 型触发（animation.md）：过程自解释的内容（流水线/主干/融合巡游），
   页面激活即演一遍（浏览/放映皆演），无需点击；点击=快进当前序列；
   prefers-reduced-motion 静态；每页每次进入只演一遍，离页再来重演。
   作者只声明数据（deck 数据区，勿改本文件）：
     window.DECK_AUTO = { 页label: [ 微指令... ] };
     微指令：['lit', [x,y,w,h]]                 区域点亮（viewBox 坐标）
             ['move', x1,y1, x2,y2, dur?]      光点飞行（dur 缺省 500ms）
   依赖：player.js（window.__deck + deckpage 事件）与 stepfx.js（fxLayer/
   fxEl/newToken/wait——本文件在混合层之后装配）。无数据时本模块不装配。
   ===================================================================== */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const boot = () => {
        const deck = window.__deck;
        if (!deck) return;
        let playedFor = null, skip = false, raf = 0;
        const seq = () => (window.DECK_AUTO || {})[deck.slides[deck.current].dataset.label];
        function lit(rect) {
            const fx = deck.fxLayer();
            if (!fx || !deck.slides[deck.current].querySelector('svg')) return Promise.resolve();
            const e = deck.fxEl('rect', { x: rect[0], y: rect[1], width: rect[2], height: rect[3], rx: 8, class: 'fx-lit auto' });
            e.setAttribute('opacity', 0);
            requestAnimationFrame(() => { e.style.transition = 'opacity .4s ease'; e.style.opacity = 1; });
            return deck.wait(420);
        }
        function move(x1, y1, x2, y2, dur) {
            return new Promise(res => {
                if (!deck.slides[deck.current].querySelector('svg')) return res();
                const token = deck.newToken('#2563eb');
                const t0 = performance.now();
                const tick = now => {
                    if (skip) { token.setAttribute('cx', x2); token.setAttribute('cy', y2); return res(); }
                    const k = Math.min(1, (now - t0) / dur);
                    const e = 1 - Math.pow(1 - k, 3);
                    token.setAttribute('cx', x1 + (x2 - x1) * e);
                    token.setAttribute('cy', y1 + (y2 - y1) * e);
                    if (k < 1) raf = requestAnimationFrame(tick); else res();
                };
                raf = requestAnimationFrame(tick);
            });
        }
        async function run() {
            const micros = seq(); if (!micros) return;
            deck.autoBusy = true; skip = false;
            for (const m of micros) {
                if (skip) { if (m[0] === 'lit') { const fx = deck.fxLayer(); const e = deck.fxEl('rect', { x: m[1][0], y: m[1][1], width: m[1][2], height: m[1][3], rx: 8, class: 'fx-lit' }); e.setAttribute('opacity', 1); } continue; }
                if (m[0] === 'lit') await lit(m[1]);
                else if (m[0] === 'move') await move(m[1], m[2], m[3], m[4], m[5] || 500);
            }
            deck.autoBusy = false;
        }
        function onpage() {
            const label = deck.slides[deck.current].dataset.label;
            if (seq() && playedFor !== deck.current) { playedFor = deck.current; run(); }
            else if (!seq()) playedFor = null;
        }
        document.addEventListener('click', () => { if (deck.autoBusy) skip = true; }, true);   // 点击=快进（捕获阶段，先于推进）
        document.addEventListener('deckpage', () => { onpage(); });
        onpage();
    };
    if (window.__deck) boot(); else addEventListener('load', boot, { once: true });
})();
