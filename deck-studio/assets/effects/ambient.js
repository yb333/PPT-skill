/* =====================================================================
   deck-studio 效果基建 · ambient.js — 常驻流转控制器（唯一源）
   ---------------------------------------------------------------------
   闭环/迭代机制页的"活流程"——光点沿航线循环巡航，走完全部回路（打回
   分支逐一出演）后到达产出节点，休息后开新周期。离页自动暂停；
   prefers-reduced-motion 静态；每 deck 至多一处（animation.md 限定）。
   作者只声明数据（deck 数据区，勿改本文件）：
     window.DECK_AMBIENT = {
       pageLabel: '机制',        // 常驻流转所在页的 data-label（无此页则不装配）
       speed: 200,               // 光点速度（viewBox 单位/秒）：平滑追踪舒适区 ~30°/s 视角，沿线需读标签
       decideMs: 500,            // 判定菱形停留：标签识读 ≥400ms
       gateMs: 950,              // 闸口停留：语义"等人"，需明显长于判定
       restMs: 1800,             // 整周期交付后的呼吸停顿
       —— 航线模型（二选一）：——
       count: 2,                 // 简写：count 个光点沿 routes[0] 错拍巡航（吞吐/并行语义）
       staggerMs: 1500,          //   错拍启动间隔（缺省 1500ms）
       lanes: [                  // 完整形式：每条光道独立路线/延迟/目标 svg（对比/多图语义）
         { route: 0, delay: 0,   svg: 0 },   // route=routes 索引；svg=页内第几个 svg（缺省 0）
         { route: 1, delay: 600, svg: 1 },   // 对比场景：左右两图各一光点同时巡航
       ],
       routes: [                 // 回路路线：按演示顺序排列，全部走完回起点开新周期
         { kind: 'fail1', backFrom: 4, decide: { at: 4, ms: decideMs, then: 'red' },
           wp: [[105,74],[231,76], ...] },   // backFrom=从该序号起光点变红；decide.at=判定点序号
         { kind: '复杂路线', backFrom: 99,
           decides: { 3: { ms: 950, gate: true, then: 'red' }, 7: { ms: 500, then: 'blue' } },
           wp: [...] },                      // decides=多点判定（序号→{ms,gate,then}），色彩只由判定驱动，
       ],                                    // 表达"一条路线走满全部回路"；与单判定 decide 互斥
       nodes: { 0:[x,y,w,h], ... },          // 节点脉冲框（按光点坐标命中；坐标系随各自 svg）
       stateAt: 6, stateRect: [x,y,w,h],     // 可选：到达该序号点亮状态区，周期结束熄灭（坐标随 lanes[0] 的 svg）
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
        /* 航线模型：lanes 完整形式优先；count/staggerMs 是"同航线错拍"简写 */
        const LANES = (CFG.lanes && CFG.lanes.length)
            ? CFG.lanes.map(l => ({ routeIdx: l.route || 0, delayMs: l.delay || 0, svgIdx: l.svg || 0 }))
            : Array.from({ length: COUNT }, (_, i) => ({ routeIdx: 0, delayMs: i * STAGGER_MS, svgIdx: 0 }));

        /* ==================== 引擎区（作者勿改） ==================== */
        const NS = 'http://www.w3.org/2000/svg';
        let lanes = [];                                     // 每条光道一份独立运行态
        let raf = 0, poll = 0, last = 0;

        const kind = ln => ROUTES[ln.cycleIdx].kind;
        const route = ln => ROUTES[ln.cycleIdx].wp;
        const active = () => deck.current === IDX && !document.hidden;
        function el(ln, tag, attrs, cls) {
            const n = document.createElementNS(NS, tag);
            for (const k in attrs) n.setAttribute(k, attrs[k]);
            if (cls) n.setAttribute('class', cls);
            ln.layer.appendChild(n);
            return n;
        }
        function build() {
            const svgs = deck.slides[IDX].querySelectorAll('svg');
            lanes = LANES.map(L => {
                const svg = svgs[L.svgIdx];
                if (!svg) return null;                      // 声明的 svg 序号不存在 → 该光道跳过
                const layer = document.createElementNS(NS, 'g');
                layer.setAttribute('class', 'ambient-layer');
                svg.appendChild(layer);
                return { L, layer, token: null, gateEl: null,
                         cycleIdx: L.routeIdx, ri: 0, segT: 0, born: false,
                         phase: 'wait', phaseT: L.delayMs, afterPhase: null };
            }).filter(Boolean);
            if (!lanes.length) return;
            const l0 = lanes[0];                            // 状态区归属第一条光道的坐标系
            if (STATE_AT != null && STATE_RECT) {
                const n = document.createElementNS(NS, 'rect');
                for (const k of ['x', 'y']) n.setAttribute(k, STATE_RECT[k == 'x' ? 0 : 1]);
                n.setAttribute('width', STATE_RECT[2]); n.setAttribute('height', STATE_RECT[3]);
                n.setAttribute('rx', 8); n.setAttribute('class', 'fstate');
                l0.layer.appendChild(n);
                l0.stateEl = n;
            }
        }
        function stateEl(ln) { return ln.stateEl || (lanes[0] && lanes[0].stateEl) || null; }
        function spawn(ln) {                                    // 错拍到点：光点现身于航线起点
            ln.token = el(ln, 'circle', { cx: route(ln)[0][0], cy: route(ln)[0][1], r: 8 }, 'ftoken');
            ln.token.setAttribute('fill', '#2563eb');
            ln.token.setAttribute('stroke', '#fff');
            ln.token.setAttribute('stroke-width', 2);
            ln.born = true;
        }
        function nodePulse(ln, i) {
            /* 按光点当前坐标命中节点框（不同路线的 waypoint 序号语义不同，不能按序号查表） */
            const pt = route(ln)[i];
            if (!pt) return;
            for (const k in NODES) {
                const r = NODES[k];
                if (pt[0] >= r[0] && pt[0] <= r[0] + r[2] && pt[1] >= r[1] && pt[1] <= r[1] + r[3]) {
                    const c = el(ln, 'circle', { cx: r[0] + r[2] / 2, cy: r[1] + r[3] / 2, r: 12 }, 'fpulse');
                    setTimeout(() => c.remove(), 750);
                    return;
                }
            }
        }
        function setPos(ln, pt) { ln.token.setAttribute('cx', pt[0]); ln.token.setAttribute('cy', pt[1]); }
        function setToken(ln, fill) { ln.token.setAttribute('fill', fill); }
        function pause(ln, ms, after) { ln.phase = 'pause'; ln.phaseT = ms; ln.afterPhase = after || null; }
        function arrive(ln, i) {
            nodePulse(ln, i);
            const R = ROUTES[ln.cycleIdx];
            if (R.decides) {                                           // 多点判定路线：色彩由各判定驱动
                const d = R.decides[i];
                if (d) {
                    setToken(ln, d.gate ? '#f59e0b' : '#ef4444');
                    if (d.gate) { if (!ln.gateEl) ln.gateEl = el(ln, 'circle', { cx: route(ln)[i][0], cy: route(ln)[i][1], r: 16 }, 'fgate'); ln.gateEl.style.opacity = 1; }
                    ln.ri++;
                    return pause(ln, d.ms, () => {
                        if (ln.gateEl) { ln.gateEl.remove(); ln.gateEl = null; }    // 移除元素（内联 opacity 压不过无限动画）
                        setToken(ln, d.then === 'red' ? '#ef4444' : '#2563eb');
                        if (d.then === 'red') { const se = stateEl(ln); if (se) se.classList.remove('on'); }
                    });
                }
            } else {
            setToken(ln, i >= R.backFrom ? '#ef4444' : '#2563eb');
            const d = R.decide;
            if (d && i === d.at) {                                     // 判定停顿：先推进索引再停（杜绝折返卡死）
                setToken(ln, d.gate ? '#f59e0b' : '#ef4444');
                if (!ln.gateEl) ln.gateEl = el(ln, 'circle', { cx: route(ln)[i][0], cy: route(ln)[i][1], r: 16 }, 'fgate');
                ln.gateEl.style.opacity = 1;
                ln.ri++;
                return pause(ln, d.ms, () => {
                    if (ln.gateEl) { ln.gateEl.remove(); ln.gateEl = null; }
                    if (d.then === 'red') { setToken(ln, '#ef4444'); const se = stateEl(ln); if (se) se.classList.remove('on'); }
                    else setToken(ln, '#2563eb');
                });
            }
            }
            if (kind(ln) === 'pass' && i === STATE_AT) { const se = stateEl(ln); if (se) se.classList.add('on'); }
            ln.ri++;
            if (ln.ri >= route(ln).length - 1) endRoute(ln);
        }
        function endRoute(ln) {
            const k = kind(ln);
            if (k === 'pass') {                                        // 全回路走完 → 交付产出，休息后开新周期
                ln.phase = 'rest'; ln.phaseT = REST_MS;
                ln.token.setAttribute('opacity', 0);
                ln.afterPhase = () => {
                    const se = stateEl(ln); if (se) se.classList.remove('on');
                    nextRoute(ln); setPos(ln, route(ln)[0]); setToken(ln, '#2563eb'); ln.token.setAttribute('opacity', .95);
                };
            } else {                                                   // 打回路线走完：改代码处重启脉冲
                nodePulse(ln, 0);
                ln.phase = 'pause'; ln.phaseT = 450;
                ln.afterPhase = () => { nextRoute(ln); setToken(ln, '#2563eb'); };
            }
        }
        function nextRoute(ln) { ln.cycleIdx = (ln.cycleIdx + 1) % ROUTES.length; ln.ri = 0; ln.segT = 0; }
        function stepLane(dt, ln) {
            if (!ln.born) {                                            // 错拍等待
                ln.phaseT -= dt;
                if (ln.phaseT <= 0) spawn(ln);
                return;
            }
            if (ln.phase !== 'move') {
                ln.phaseT -= dt;
                if (ln.phaseT <= 0) { const f = ln.afterPhase; ln.afterPhase = null; ln.phase = 'move'; if (f) f(); }
                return;
            }
            const wp = route(ln);
            const A = wp[ln.ri], B = wp[ln.ri + 1];
            const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
            ln.segT += dt / 1000 * SPEED;
            const k = Math.min(1, ln.segT / len);
            setPos(ln, [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]);
            if (k >= 1) { ln.segT = 0; arrive(ln, ln.ri + 1); }
        }
        function frame(now) {
            if (!active()) { raf = 0; poll = setTimeout(schedule, 400); return; }
            if (!last) last = now;
            const dt = Math.min(50, now - last);
            for (const ln of lanes) stepLane(dt, ln);
            last = now;
            raf = requestAnimationFrame(frame);
        }
        function schedule() {
            cancelAnimationFrame(raf); clearTimeout(poll);
            if (active()) { if (!lanes.length) build(); last = 0; raf = requestAnimationFrame(frame); }
            else poll = setTimeout(schedule, 400);
        }
        document.addEventListener('deckpage', schedule);
        schedule();
    };
    if (window.__deck) boot(); else addEventListener('load', boot, { once: true });
})();
