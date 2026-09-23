/* =====================================================================
   deck-studio 效果基建 · ambient.js — 常驻流转控制器（唯一源）
   ---------------------------------------------------------------------
   闭环/迭代机制页的"活流程"——光点循环巡航，每周期走完全部回路（打回
   分支逐一出演）后到达产出节点，休息后开新周期。离页自动暂停；
   prefers-reduced-motion 静态；每 deck 至多一处（animation.md 限定）。
   作者只声明数据（deck 数据区，勿改本文件）：
     window.DECK_AMBIENT = {
       pageLabel: '机制',        // 常驻流转所在页的 data-label（无此页则不装配）
       speed: 200,               // 光点速度（viewBox 单位/秒）：平滑追踪舒适区 ~30°/s 视角，沿线需读标签
       decideMs: 500,            // 判定菱形停留：标签识读 ≥400ms
       gateMs: 950,              // 闸口停留：语义"等人"，需明显长于判定
       restMs: 1800,             // 整周期交付后的呼吸停顿
       routes: [                 // 回路路线：按演示顺序排列，全部走完回起点开新周期
         { kind: 'fail1', backFrom: 4, decide: { at: 4, ms: decideMs, then: 'red' },
           wp: [[105,74],[231,76], ...] },   // backFrom=从该序号起光点变红；decide.at=判定点序号
       ],
       nodes: { 0:[x,y,w,h], ... },          // 节点脉冲框（按光点坐标命中，无则只过光点）
       stateAt: 6, stateRect: [x,y,w,h],     // 可选：到达该序号点亮状态区，周期结束熄灭；不需要设 null
     };
   依赖：player.js（window.__deck + deckpage 事件）+ effects.css（ambient-layer 样式）。
   ===================================================================== */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const boot = () => {
        const deck = window.__deck, CFG = window.DECK_AMBIENT;
        if (!deck || !CFG) return;                          // 本 deck 无常驻流转声明 → 不装配
        const IDX = deck.slides.findIndex(s => s.dataset.label === CFG.pageLabel);
        if (IDX < 0) return;
        const SPEED = CFG.speed || 200, DECIDE_MS = CFG.decideMs || 500,
              GATE_MS = CFG.gateMs || 950, REST_MS = CFG.restMs || 1800;
        const ROUTES = CFG.routes || [], NODES = CFG.nodes || {},
              STATE_AT = (CFG.stateAt == null ? null : CFG.stateAt),
              STATE_RECT = CFG.stateRect || null;

        /* ==================== 引擎区（作者勿改） ==================== */
        const NS = 'http://www.w3.org/2000/svg';
        let layer = null, token = null, stateEl = null, gateEl = null;
        let cycleIdx = 0, ri = 0, segT = 0;
        let phase = 'move', phaseT = 0, afterPhase = null, last = 0, raf = 0, poll = 0;

        const kind = () => ROUTES[cycleIdx].kind;
        const route = () => ROUTES[cycleIdx].wp;
        const active = () => deck.current === IDX && !document.hidden;
        function el(tag, attrs, cls) {
            const n = document.createElementNS(NS, tag);
            for (const k in attrs) n.setAttribute(k, attrs[k]);
            if (cls) n.setAttribute('class', cls);
            layer.appendChild(n);
            return n;
        }
        function build() {
            const svg = deck.slides[IDX].querySelector('svg');
            layer = document.createElementNS(NS, 'g');
            layer.setAttribute('class', 'ambient-layer');
            svg.appendChild(layer);
            token = el('circle', { cx: route()[0][0], cy: route()[0][1], r: 8 }, 'ftoken');
            token.setAttribute('fill', '#2563eb');
            token.setAttribute('stroke', '#fff');
            token.setAttribute('stroke-width', 2);
            if (STATE_AT != null && STATE_RECT) {
                stateEl = el('rect', { x: STATE_RECT[0], y: STATE_RECT[1], width: STATE_RECT[2], height: STATE_RECT[3], rx: 8 }, 'fstate');
            }
        }
        function nodePulse(i) {
            /* 按光点当前坐标命中节点框（不同路线的 waypoint 序号语义不同，不能按序号查表） */
            const pt = route()[i];
            if (!pt) return;
            for (const k in NODES) {
                const r = NODES[k];
                if (pt[0] >= r[0] && pt[0] <= r[0] + r[2] && pt[1] >= r[1] && pt[1] <= r[1] + r[3]) {
                    const c = el('circle', { cx: r[0] + r[2] / 2, cy: r[1] + r[3] / 2, r: 12 }, 'fpulse');
                    setTimeout(() => c.remove(), 750);
                    return;
                }
            }
        }
        function setPos(pt) { token.setAttribute('cx', pt[0]); token.setAttribute('cy', pt[1]); }
        function setToken(fill) { token.setAttribute('fill', fill); }
        function pause(ms, after) { phase = 'pause'; phaseT = ms; afterPhase = after || null; }
        function arrive(i) {
            nodePulse(i);
            const R = ROUTES[cycleIdx];
            setToken(i >= R.backFrom ? '#ef4444' : '#2563eb');
            const d = R.decide;
            if (d && i === d.at) {                                     // 判定停顿：先推进索引再停（杜绝折返卡死）
                setToken(d.gate ? '#f59e0b' : '#ef4444');
                if (!gateEl) gateEl = el('circle', { cx: route()[i][0], cy: route()[i][1], r: 16 }, 'fgate');
                gateEl.style.opacity = 1;
                ri++;
                return pause(d.ms, () => {
                    if (gateEl) { gateEl.remove(); gateEl = null; }    // 移除元素（内联 opacity 压不过无限动画）
                    if (d.then === 'red') { setToken('#ef4444'); if (stateEl) stateEl.classList.remove('on'); }
                    else setToken('#2563eb');
                });
            }
            if (kind() === 'pass' && i === STATE_AT && stateEl) stateEl.classList.add('on');
            ri++;
            if (ri >= route().length - 1) endRoute();
        }
        function endRoute() {
            const k = kind();
            if (k === 'pass') {                                        // 全回路走完 → 交付产出，休息后开新周期
                phase = 'rest'; phaseT = REST_MS;
                token.setAttribute('opacity', 0);
                afterPhase = () => { if (stateEl) stateEl.classList.remove('on'); nextRoute(); token.setAttribute('opacity', .95); };
            } else {                                                   // 打回路线走完：改代码处重启脉冲
                nodePulse(0);
                phase = 'pause'; phaseT = 450;
                afterPhase = () => { nextRoute(); setToken('#2563eb'); };
            }
        }
        function nextRoute() { cycleIdx = (cycleIdx + 1) % ROUTES.length; ri = 0; segT = 0; }
        function step(dt) {
            if (phase !== 'move') {
                phaseT -= dt;
                if (phaseT <= 0) { const f = afterPhase; afterPhase = null; phase = 'move'; if (f) f(); }
                return;
            }
            const wp = route();
            const A = wp[ri], B = wp[ri + 1];
            const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
            segT += dt / 1000 * SPEED;
            const k = Math.min(1, segT / len);
            setPos([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]);
            if (k >= 1) { segT = 0; arrive(ri + 1); }
        }
        function frame(now) {
            if (!active()) { raf = 0; poll = setTimeout(schedule, 400); return; }
            if (!last) last = now;
            step(Math.min(50, now - last));
            last = now;
            raf = requestAnimationFrame(frame);
        }
        function schedule() {
            cancelAnimationFrame(raf); clearTimeout(poll);
            if (active()) { if (!layer) build(); last = 0; raf = requestAnimationFrame(frame); }
            else poll = setTimeout(schedule, 400);
        }
        document.addEventListener('deckpage', schedule);
        schedule();
    };
    if (window.__deck) boot(); else addEventListener('load', boot, { once: true });
})();
