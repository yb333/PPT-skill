/* =====================================================================
   deck-studio 效果基建 · auto.js — A 型自动连播调度器（唯一源）
   ---------------------------------------------------------------------
   A 型触发（animation.md）：过程自解释的内容（流水线/主干/融合巡游），
   页面激活即演一遍（浏览/放映皆演），无需点击；点击=快进当前序列；
   prefers-reduced-motion 静态；每页每次进入只演一遍，离页再来重演。
   作者只声明数据（deck 数据区，勿改本文件）：
     window.DECK_AUTO = { 页label: [ 微指令... ] };
     微指令：['flow', x1,y1, x2,y2, dur?, color?]  流线脉冲：一段"撑大的线"沿起点→终点流转后消失（dur 缺省 600ms，color 缺省 #60a5fa）
             ['flows', [[x1,y1,x2,y2, color?],...], dur?, color?]  多条流线同时流转（扇出/并行；每线颜色可单独覆盖）
             ['pulse', [x,y,w,h]]              到站脉冲：区域中心蓝色涟漪，~750ms 即逝，不染色
             ['pulses', [[x,y,w,h],...]]       多区域同时脉冲（同步到站语义）
             ['lit', [x,y,w,h]]                （遗留·染色）区域点亮——不染色法则下禁用
             ['wseq', [rect,...]]              （遗留·染色）多区域连播——同上
   序列收尾：fx 层清空，页面 100% 恢复原样（终态不变式）；
   序列绑定进页时的页号，换页即作废（防止旧序列画到新页上）。
   依赖：player.js（window.__deck + deckpage 事件）与 stepfx.js（fxLayer/
   fxEl/newToken/wait——本文件在混合层之后装配）。无数据时本模块不装配。
   ===================================================================== */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const boot = () => {
        const deck = window.__deck;
        if (!deck) return;
        let playedFor = null, skip = false, raf = 0, pageIdx = -1;
        const seq = () => (window.DECK_AUTO || {})[deck.slides[deck.current].dataset.label];
        function lit(rect) {
            const fx = deck.fxLayer();
            if (!fx || !deck.slides[deck.current].querySelector('svg')) return Promise.resolve();
            const e = deck.fxEl('rect', { x: rect[0], y: rect[1], width: rect[2], height: rect[3], rx: 8, class: 'fx-lit auto' });
            e.setAttribute('opacity', 0);
            requestAnimationFrame(() => { e.style.transition = 'opacity .4s ease'; e.style.opacity = 1; });
            return deck.wait(420);
        }
        function pulse(rect) {
            const fx = deck.fxLayer();
            if (!fx || !deck.slides[deck.current].querySelector('svg')) return;
            const c = deck.fxEl('circle', { cx: rect[0] + rect[2] / 2, cy: rect[1] + rect[3] / 2, r: 14 }, 'fpulse');
            setTimeout(() => c.remove(), 750);
        }
        /* 流线脉冲：覆盖线与箭头同几何，短划（撑大段）经 stroke-dashoffset 从起点流转到终点后移除 */
        function flow(x1, y1, x2, y2, dur, color) {
            return new Promise(res => {
                const fx = deck.fxLayer();
                if (!fx || !deck.slides[deck.current].querySelector('svg')) return res();
                const len = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
                const seg = Math.min(64, len * 0.45);
                const line = deck.fxEl('line', { x1, y1, x2, y2, stroke: color || '#60a5fa',
                    'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 });
                line.setAttribute('stroke-dasharray', `${seg} ${len + seg}`);
                line.setAttribute('stroke-dashoffset', seg);            // 起点前藏住
                fx.appendChild(line);
                const t0 = performance.now();
                const tick = now => {
                    if (skip || deck.current !== pageIdx) { line.remove(); return res(); }
                    const k = Math.min(1, (now - t0) / dur);
                    const e = 1 - Math.pow(1 - k, 3);
                    line.setAttribute('stroke-dashoffset', seg - (seg + len) * e);
                    if (k < 1) raf = requestAnimationFrame(tick); else { line.remove(); res(); }
                };
                raf = requestAnimationFrame(tick);
            });
        }
        function move(x1, y1, x2, y2, dur, color) {              // （遗留·光点）不染色法则下新 deck 勿用
            return new Promise(res => {
                if (!deck.slides[deck.current].querySelector('svg')) return res();
                const token = deck.newToken(color || '#2563eb');
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
            pageIdx = deck.current;                              // 序列绑定进页时的页面：换页即作废（防串页）
            deck.autoBusy = true; skip = false;
            const stale = () => deck.current !== pageIdx;
            for (const m of micros) {
                if (stale()) { deck.autoBusy = false; return; }
                if (skip) { if (m[0] === 'lit') { const fx = deck.fxLayer(); const e = deck.fxEl('rect', { x: m[1][0], y: m[1][1], width: m[1][2], height: m[1][3], rx: 8, class: 'fx-lit' }); e.setAttribute('opacity', 1); } else if (m[0] === 'wseq') { for (const r of m[1]) { const fx = deck.fxLayer(); if (!fx) break; const e = deck.fxEl('rect', { x: r[0], y: r[1], width: r[2], height: r[3], rx: 8, class: 'fx-lit' }); e.setAttribute('opacity', 1); } } continue; }
                if (m[0] === 'lit') await lit(m[1]);
                else if (m[0] === 'wseq') { for (const r of m[1]) await lit(r); }
                else if (m[0] === 'flow') await flow(m[1], m[2], m[3], m[4], m[5] || 600, m[6]);
                else if (m[0] === 'flows') await Promise.all(m[1].map(w => flow(w[0], w[1], w[2], w[3], m[2] || 900, w[4] || m[3])));
                else if (m[0] === 'move') await move(m[1], m[2], m[3], m[4], m[5] || 500, m[6]);
                else if (m[0] === 'pulse') { pulse(m[1]); await deck.wait(skip ? 60 : 420); }
                else if (m[0] === 'pulses') { for (const r of m[1]) pulse(r); await deck.wait(skip ? 60 : 750); }
            }
            if (stale()) { deck.autoBusy = false; return; }      // 已换页：fx 归新页面序列所有
            deck.autoBusy = false;
            setTimeout(() => { if (!deck.autoBusy && deck.current === pageIdx) deck.clearFx(); }, 700);
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
