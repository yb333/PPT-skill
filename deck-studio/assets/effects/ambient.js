/* =====================================================================
   deck-studio 效果基建 · ambient.js
   常驻流转控制器：闭环/迭代机制页的"活流程"——光点循环巡航，每周期走完全部
   回路（打回分支逐一出演）后到达产出节点，休息后开新周期。
   用法：
     1. 前置：player 壳（window.__deck + syncChrome 内派发 deckpage 事件）+ effects.css
     2. 本文件整体粘贴到 deck 脚本末尾
     3. 作者只改【作者参数区】：页面 label、节奏常量、回路路线（viewBox 坐标）
   限定（animation.md）：仅闭环/迭代内容；每 deck 至多一处；离页自动暂停；
   reduced-motion 静态。提取自参考实现 docs/emp/agent-concept_deck-studio.html（已验证）。
   ===================================================================== */
(function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const deck = window.__deck;

    /* ==================== 作者参数区（只改这里） ==================== */
    const PAGE_LABEL = '机制';   // 常驻流转所在页的 data-label
    const SPEED = 200;           // 光点速度（viewBox 单位/秒）：平滑追踪舒适区 ~30°/s 视角（全屏 2~4s 横穿），沿线需读标签
    const DECIDE_MS = 500;       // 判定菱形停留：标签识读 ≥400ms
    const GATE_MS = 950;         // 闸口停留：语义"等人"，需明显长于判定
    const REST_MS = 1800;        // 整周期交付后的呼吸停顿
    /* 回路路线：按演示顺序排列，全部走完后回起点开新周期。
       kind 仅作语义标注；backFrom = 从该 waypoint 序号起光点变红（打回段）；
       decide = 判定菱形（at: 序号，ms: 停留，gate: 是否闸口环，then: 停完后的光点色 'red'|'blue'）。 */
    const ROUTES = [
        { kind: 'fail1', backFrom: 4, decide: { at: 4, ms: DECIDE_MS, then: 'red' },
          wp: [[105,74],[231,76],[362,74],[362,140],[270,139],[190,118],[105,74]] },
        { kind: 'fail2', backFrom: 5, decide: { at: 5, ms: DECIDE_MS, then: 'red' },
          wp: [[105,74],[231,76],[362,74],[362,140],[270,139],[270,192],[160,168],[105,74]] },
        { kind: 'fail3', backFrom: 8, decide: { at: 7, ms: GATE_MS, gate: true, then: 'red' },
          wp: [[105,74],[231,76],[362,74],[362,140],[270,139],[270,192],[270,244],[270,303],[400,303],[400,80],[160,80],[105,74]] },
        { kind: 'pass', backFrom: 99, decide: { at: 7, ms: GATE_MS, gate: true, then: 'blue' },
          wp: [[105,74],[231,76],[362,74],[362,140],[270,139],[270,192],[270,244],[270,303],[270,361]] },
    ];
    /* 节点脉冲（waypoint 序号 → viewBox 高亮框 [x,y,w,h]；无则该点只过光点） */
    const NODES = {0:[50,50,110,48],1:[188,56,86,40],2:[302,50,120,48],3:[318,120,88,40],4:[250,124,40,30],5:[235,178,70,28],6:[210,228,120,32],7:[200,282,140,42],8:[215,346,110,30]};
    /* 状态变色 overlay（可选）：到达 STATE_AT 序号时点亮 STATE_RECT 区域，周期结束熄灭；不需要设为 null */
    const STATE_AT = 6;
    const STATE_RECT = [210, 228, 120, 32];
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
})();
