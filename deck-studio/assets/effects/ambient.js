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
       count: 2,                 // 并行光点数（缺省 1 = 单光点）：多光点沿同一航线错拍巡航，
                                 // 各自独立判定/停泊/交付——表达流水线的并行语义
       staggerMs: 1500,          // 光点错拍启动间隔（缺省 1500ms）
       routes: [                 // 回路路线：按演示顺序排列，全部走完回起点开新周期
         { kind: 'fail1', backFrom: 4, decide: { at: 4, ms: decideMs, then: 'red' },
           wp: [[105,74],[231,76], ...] },   // backFrom=从该序号起光点变红；decide.at=判定点序号
         { kind: '复杂路线', backFrom: 99,
           decides: { 3: { ms: 950, gate: true, then: 'red' }, 7: { ms: 500, then: 'blue' } },
           wp: [...] },                      // decides=多点判定（序号→{ms,gate,then}），色彩只由判定驱动，
       ],                                    // 表达"一条路线走满全部回路"；与单判定 decide 互斥
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
        const COUNT = Math.max(1, CFG.count || 1);
        const STAGGER_MS = CFG.staggerMs != null ? CFG.staggerMs : 1500;
        const ROUTES = CFG.routes || [], NODES = CFG.nodes || {},
              STATE_AT = (CFG.stateAt == null ? null : CFG.stateAt),
              STATE_RECT = CFG.stateRect || null;

        /* ==================== 引擎区（作者勿改） ==================== */
        const NS = 'http://www.w3.org/2000/svg';
        let layer = null, stateEl = null, tokens = [];
        let raf = 0, poll = 0, last = 0;

        const kind = tk => ROUTES[tk.cycleIdx].kind;
        const route = tk => ROUTES[tk.cycleIdx].wp;
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
            if (STATE_AT != null && STATE_RECT) {
                stateEl = el('rect', { x: STATE_RECT[0], y: STATE_RECT[1], width: STATE_RECT[2], height: STATE_RECT[3], rx: 8 }, 'fstate');
            }
            tokens = Array.from({ length: COUNT }, (_, i) => ({
                el: null, gateEl: null,
                cycleIdx: 0, ri: 0, segT: 0, born: false,
                phase: 'wait', phaseT: i * STAGGER_MS, afterPhase: null,   // 错拍：wait 相位倒数
            }));
        }
        function spawn(tk) {                                    // 错拍到点：光点现身于航线起点
            tk.el = el('circle', { cx: route(tk)[0][0], cy: route(tk)[0][1], r: 8 }, 'ftoken');
            tk.el.setAttribute('fill', '#2563eb');
            tk.el.setAttribute('stroke', '#fff');
            tk.el.setAttribute('stroke-width', 2);
            tk.born = true;
        }
        function nodePulse(tk, i) {
            /* 按光点当前坐标命中节点框（不同路线的 waypoint 序号语义不同，不能按序号查表） */
            const pt = route(tk)[i];
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
        function setPos(tk, pt) { tk.el.setAttribute('cx', pt[0]); tk.el.setAttribute('cy', pt[1]); }
        function setToken(tk, fill) { tk.el.setAttribute('fill', fill); }
        function pause(tk, ms, after) { tk.phase = 'pause'; tk.phaseT = ms; tk.afterPhase = after || null; }
        function arrive(tk, i) {
            nodePulse(tk, i);
            const R = ROUTES[tk.cycleIdx];
            if (R.decides) {                                           // 多点判定路线：色彩由各判定驱动
                const d = R.decides[i];
                if (d) {
                    setToken(tk, d.gate ? '#f59e0b' : '#ef4444');
                    if (d.gate) { if (!tk.gateEl) tk.gateEl = el('circle', { cx: route(tk)[i][0], cy: route(tk)[i][1], r: 16 }, 'fgate'); tk.gateEl.style.opacity = 1; }
                    tk.ri++;
                    return pause(tk, d.ms, () => {
                        if (tk.gateEl) { tk.gateEl.remove(); tk.gateEl = null; }    // 移除元素（内联 opacity 压不过无限动画）
                        setToken(tk, d.then === 'red' ? '#ef4444' : '#2563eb');
                        if (d.then === 'red' && stateEl) stateEl.classList.remove('on');
                    });
                }
            } else {
            setToken(tk, i >= R.backFrom ? '#ef4444' : '#2563eb');
            const d = R.decide;
            if (d && i === d.at) {                                     // 判定停顿：先推进索引再停（杜绝折返卡死）
                setToken(tk, d.gate ? '#f59e0b' : '#ef4444');
                if (!tk.gateEl) tk.gateEl = el('circle', { cx: route(tk)[i][0], cy: route(tk)[i][1], r: 16 }, 'fgate');
                tk.gateEl.style.opacity = 1;
                tk.ri++;
                return pause(tk, d.ms, () => {
                    if (tk.gateEl) { tk.gateEl.remove(); tk.gateEl = null; }
                    if (d.then === 'red') { setToken(tk, '#ef4444'); if (stateEl) stateEl.classList.remove('on'); }
                    else setToken(tk, '#2563eb');
                });
            }
            }
            if (kind(tk) === 'pass' && i === STATE_AT && stateEl) stateEl.classList.add('on');
            tk.ri++;
            if (tk.ri >= route(tk).length - 1) endRoute(tk);
        }
        function endRoute(tk) {
            const k = kind(tk);
            if (k === 'pass') {                                        // 全回路走完 → 交付产出，休息后开新周期
                tk.phase = 'rest'; tk.phaseT = REST_MS;
                tk.el.setAttribute('opacity', 0);
                tk.afterPhase = () => { if (stateEl) stateEl.classList.remove('on'); nextRoute(tk); setPos(tk, route(tk)[0]); setToken(tk, '#2563eb'); tk.el.setAttribute('opacity', .95); };
            } else {                                                   // 打回路线走完：改代码处重启脉冲
                nodePulse(tk, 0);
                tk.phase = 'pause'; tk.phaseT = 450;
                tk.afterPhase = () => { nextRoute(tk); setToken(tk, '#2563eb'); };
            }
        }
        function nextRoute(tk) { tk.cycleIdx = (tk.cycleIdx + 1) % ROUTES.length; tk.ri = 0; tk.segT = 0; }
        function stepToken(dt, tk) {
            if (!tk.born) {                                            // 错拍等待
                tk.phaseT -= dt;
                if (tk.phaseT <= 0) spawn(tk);
                return;
            }
            if (tk.phase !== 'move') {
                tk.phaseT -= dt;
                if (tk.phaseT <= 0) { const f = tk.afterPhase; tk.afterPhase = null; tk.phase = 'move'; if (f) f(); }
                return;
            }
            const wp = route(tk);
            const A = wp[tk.ri], B = wp[tk.ri + 1];
            const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
            tk.segT += dt / 1000 * SPEED;
            const k = Math.min(1, tk.segT / len);
            setPos(tk, [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]);
            if (k >= 1) { tk.segT = 0; arrive(tk, tk.ri + 1); }
        }
        function frame(now) {
            if (!active()) { raf = 0; poll = setTimeout(schedule, 400); return; }
            if (!last) last = now;
            const dt = Math.min(50, now - last);
            for (const tk of tokens) stepToken(dt, tk);
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
