/* =====================================================================
   deck-studio 效果基建 · countup.js — 数字滚动（A 型入口动效，唯一源）
   ---------------------------------------------------------------------
   进页把声明的数字文本从 0 滚到真值（8 机制之 count-up），轻错拍依次启动；
   终帧严格还原原文（含前后缀，如「50+」「≈3~5×」）——终态不变式。
   reduced-motion 静态；同页重复进入会重滚（与 auto 语义一致）。
   作者只声明数据（deck 数据区，勿改本文件）：
     window.DECK_COUNTUP = {
       页label: { ms: 1200, items: [[x, y], ...] },   // (x,y) = svg <text> 的坐标属性
     };
   匹配规则：页 svg 内 x/y 属性精确相等的 <text>；文本解析为「前缀 + 整数 + 后缀」
   滚动整数部分。找不强求——没匹配到就静默跳过。
   依赖：player.js（window.__deck + deckpage 事件）。无声明时本模块不装配。
   ===================================================================== */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const boot = () => {
        const deck = window.__deck, CFG = window.DECK_COUNTUP;
        if (!deck || !CFG) return;
        let playedFor = null;
        function roll(pageLabel) {
            const conf = CFG[pageLabel]; if (!conf) return;
            const svg = deck.slides[deck.current].querySelector('svg'); if (!svg) return;
            const texts = [...svg.querySelectorAll('text')];
            const els = (conf.items || [])
                .map(([x, y]) => texts.find(t => +t.getAttribute('x') === x && +t.getAttribute('y') === y))
                .filter(Boolean);
            if (!els.length) return;
            const dur = conf.ms || 1200;
            els.forEach((el, k) => {
                const orig = el.textContent;
                const m = orig.match(/^(\D*?)(\d[\d,]*)(.*)$/); if (!m) return;
                const target = parseInt(m[2].replace(/,/g, ''), 10);
                const t0 = performance.now() + k * 120;          // 轻微错拍，不齐刷刷
                const tick = now => {
                    const p = Math.min(1, Math.max(0, (now - t0) / dur));
                    if (p >= 1) { el.textContent = orig; return; }   // 终帧 = 原文
                    const e = 1 - Math.pow(1 - p, 3);
                    el.textContent = m[1] + Math.round(target * e) + m[3];
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        }
        function onpage() {
            const label = deck.slides[deck.current].dataset.label;
            if (CFG[label] && playedFor !== deck.current) { playedFor = deck.current; roll(label); }
            else if (!CFG[label]) playedFor = null;
        }
        document.addEventListener('deckpage', onpage);
        onpage();
    };
    if (window.__deck) boot(); else addEventListener('load', boot, { once: true });
})();
