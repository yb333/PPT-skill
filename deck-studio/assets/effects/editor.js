/* =====================================================================
   deck-studio · editor.js — 所见即所得编辑内核（唯一源：sync 内嵌进 deck，deck-serve 兜底注入旧 deck，两处共用）
   ---------------------------------------------------------------------
   交互（对照 PPT）：按 E 进出编辑态；点文字直接改（plaintext-only 就地编辑）；
   单击选中（蓝框）· 拖拽挪位 · 方向键 1px 微调（Shift=10px，绝对定位改 left/top，
   流式元素改 margin）；浮动工具条：主题色板/刻度字号/加粗/对齐；Ctrl+Z 撤销；
   Ctrl+S 保存 = 序列化干净副本 POST /__deck/save → 服务端门禁与写回。

   设计约束：编辑只作用于 section.slide 内的 HTML 元素（svg 内部/引擎 chrome 除外）；
   所有修改以 inline style / 文本节点落地，天然可序列化；保存前在克隆上脱渲染
   （去编辑器痕迹与运行态），原文件结构与引擎块不动。
   ===================================================================== */
(function () {
    if (window.__deckEditor) return;
    window.__deckEditor = true;

    /* —— 编辑态视觉层：自带样式（序列化时随 [data-deck-editor] 剥除）—— */
    const editorStyle = document.createElement('style');
    editorStyle.setAttribute('data-deck-editor', '1');
    editorStyle.textContent = `
/* —— 编辑态：悬停可选中提示 + 选中框；编辑中隐藏 deck-bar 防误触放映 —— */
body.deck-editing { cursor: default; }
body.deck-editing .deck-bar { visibility: hidden; }
body.deck-editing section.slide :hover { outline: 1.5px dashed rgba(47, 111, 208, .45); outline-offset: 2px; }
.deck-edit-sel { outline: 2px solid #2f6fd0 !important; outline-offset: 2px; cursor: move; }
.deck-edit-sel[contenteditable] { cursor: text; outline-style: solid; }

/* —— 编辑器 UI（deck-editor-ui：序列化时剥除）—— */
.deck-editor-ui { position: fixed; z-index: 10000; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; transition: opacity .25s ease; }

/* —— 放映态：编辑 UI 全部退场 —— */
body.presenting .deck-editor-ui { opacity: 0; pointer-events: none; }

.deck-edit-pill {
    left: 20px; bottom: 20px; padding: 8px 16px; border: 1px solid rgba(255, 255, 255, .65);
    border-radius: 999px; background: rgba(22, 41, 74, .88); color: #fff;
    font-size: 13px; letter-spacing: .04em; cursor: pointer;
    box-shadow: 0 6px 24px rgba(15, 23, 42, .25);
    backdrop-filter: saturate(180%) blur(12px);
}
.deck-edit-pill:hover { background: rgba(47, 111, 208, .92); }

.deck-edit-bar {
    display: flex; align-items: center; gap: 6px; padding: 6px 8px;
    border: 1px solid rgba(255, 255, 255, .65); border-radius: 10px;
    background: rgba(248, 250, 252, .92); box-shadow: 0 8px 28px rgba(15, 23, 42, .22);
    backdrop-filter: saturate(180%) blur(12px);
}
.deck-edit-bar[hidden] { display: none; }
.deck-edit-bar button, .deck-edit-bar select {
    border: 1px solid #d5d9de; border-radius: 6px; background: #fff; color: #1e293b;
    font-size: 13px; line-height: 1; padding: 5px 8px; cursor: pointer;
}
.deck-edit-bar button:hover { border-color: #2f6fd0; color: #2f6fd0; }
.deck-edit-swatch { width: 22px; height: 22px; padding: 0 !important; }
.deck-edit-swatch:hover { transform: scale(1.12); }

.deck-edit-toast {
    right: 20px; bottom: 20px; max-width: 460px; padding: 10px 16px;
    border-radius: 10px; font-size: 13px; line-height: 1.5; color: #fff;
    background: rgba(22, 41, 74, .92); box-shadow: 0 8px 28px rgba(15, 23, 42, .3);
    opacity: 0; transform: translateY(8px); transition: opacity .25s ease, transform .25s ease;
    pointer-events: none; white-space: pre-wrap;
}
.deck-edit-toast.show { opacity: 1; transform: none; }
.deck-edit-toast.ok { border-left: 3px solid #34d399; }
.deck-edit-toast.bad { border-left: 3px solid #f87171; }

/* —— 对齐参考线（吸附时出现：微调闪现 700ms，拖拽期间常驻）—— */
.deck-edit-guides { position: fixed; inset: 0; pointer-events: none; z-index: 9999; }
.deck-edit-guides .vg { width: 1px; background: #ef4444; }
.deck-edit-guides .hg { height: 1px; background: #ef4444; }

/* —— SVG 文字受限编辑的覆盖输入框 —— */
.deck-edit-svg-input { border: 2px solid #2f6fd0; border-radius: 4px; padding: 0 6px;
  background: #fff; color: #1e293b; outline: none; font-weight: 600;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }

/* —— 字号 stepper 读数 —— */
.deck-edit-size { min-width: 26px; text-align: center; font-size: 13px; color: #1e293b; }
    `;
    document.head.appendChild(editorStyle);


    const EDITING = 'deck-editing', SEL = 'deck-edit-sel';
    const SKIP = '.deck-bar, .deck-sidebar, .player-hint, .deck-editor-ui, svg, svg *';
    const SIZES = [9, 10, 11, 12, 14, 15, 17, 18, 19, 21, 24, 25, 32, 40, 48, 56, 66, 88];
    const SWATCH_NAMES = ['--ys-navy', '--ys-blue', '--ys-blue-lt', '--text', '--text-sub', '--text-faint'];
    const FALLBACK = ['#16294a', '#2f6fd0', '#63b3ff', '#1e293b', '#64748b', '#94a3b8'];

    let selected = null;
    let undoStack = [], lastOp = null;
    let drag = null;                       // {el, prop, startX, startY, originX, originY, pushed}

    const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '';
    const kebab = p => p.replace(/[A-Z]/g, c => '-' + c.toLowerCase());   // CSSOM 只认 kebab-case，驼峰静默无效
    const setIn = (el, prop, val) => el.style.setProperty(kebab(prop), val);
    const getIn = (el, prop) => el.style.getPropertyValue(kebab(prop));
    const dropIn = (el, prop) => el.style.removeProperty(kebab(prop));
    const editing = () => document.body.classList.contains(EDITING);
    const typing = () => !!document.activeElement?.isContentEditable;
    const skippable = el => !el || !el.closest('section.slide') || el.closest(SKIP);

    /* —— UI 骨架：胶囊按钮 + 浮动工具条 + toast（全部 deck-editor-ui，序列化时剥除）—— */
    const ui = tag => { const n = document.createElement(tag); n.className = 'deck-editor-ui'; return n; };
    const pill = ui('button');
    pill.className += ' deck-edit-pill';
    pill.textContent = '✏️ 编辑（E）';
    pill.addEventListener('click', () => toggle());
    document.body.appendChild(pill);

    const bar = ui('div');
    bar.className += ' deck-edit-bar';
    bar.hidden = true;
    SWATCH_NAMES.forEach((name, i) => {
        const b = document.createElement('button');
        b.className = 'deck-edit-swatch';
        b.title = '文字颜色';
        b.style.background = css(name) || FALLBACK[i];
        b.addEventListener('click', () => applyStyle('color', b.style.background));
        bar.appendChild(b);
    });
    const sizeMinus = document.createElement('button');
    sizeMinus.textContent = '−';
    sizeMinus.title = '字号 −（刻度档）';
    sizeMinus.addEventListener('click', () => stepSize(-1));
    const sizeReadout = document.createElement('span');
    sizeReadout.className = 'deck-edit-size';
    const sizePlus = document.createElement('button');
    sizePlus.textContent = '+';
    sizePlus.title = '字号 +（刻度档）';
    sizePlus.addEventListener('click', () => stepSize(1));
    bar.appendChild(sizeMinus);
    bar.appendChild(sizeReadout);
    bar.appendChild(sizePlus);
    /* dir>0 取刻度上档、<0 取下档（当前值恰在刻度上时取相邻档） */
    function stepSize(dir) {
        if (!selected) return;
        const fs = parseFloat(getComputedStyle(selected).fontSize);
        const cand = dir > 0 ? SIZES.find(s => s > fs + .5) : [...SIZES].reverse().find(s => s < fs - .5);
        if (!cand) return;
        applyStyle('fontSize', cand + 'px');
        sizeReadout.textContent = cand;
    }
    const boldBtn = document.createElement('button');
    boldBtn.textContent = 'B';
    boldBtn.title = '加粗/取消';
    boldBtn.addEventListener('click', () => {
        const cur = selected ? getComputedStyle(selected).fontWeight : '400';
        applyStyle('fontWeight', Number(cur) >= 600 ? '400' : '700');
    });
    bar.appendChild(boldBtn);
    const alignBtn = document.createElement('button');
    alignBtn.textContent = '≡';
    alignBtn.title = '对齐（左→中→右）';
    alignBtn.addEventListener('click', () => {
        const order = ['left', 'center', 'right'];
        const cur = selected ? (selected.style.textAlign || getComputedStyle(selected).textAlign) : 'left';
        applyStyle('textAlign', order[(order.indexOf(cur) + 1) % 3]);
    });
    bar.appendChild(alignBtn);
    document.body.appendChild(bar);

    let toastTimer = null;
    const toastEl = ui('div');
    toastEl.className += ' deck-edit-toast';
    document.body.appendChild(toastEl);
    function toast(msg, ok = true) {
        toastEl.textContent = msg;
        toastEl.className = 'deck-editor-ui deck-edit-toast show ' + (ok ? 'ok' : 'bad');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4200);
    }

    /* —— 撤销：op = {type:'style'|'text', el, prop, old, new, at}；800ms 内同属性合并 —— */
    function pushOp(op) {
        const now = Date.now();
        if (lastOp && lastOp.type === op.type && lastOp.el === op.el && lastOp.prop === op.prop && now - lastOp.at < 800) {
            lastOp.new = op.new; lastOp.at = now;
            return;
        }
        op.at = now;
        undoStack.push(op); lastOp = op;
        if (undoStack.length > 200) undoStack.shift();
    }
    function undo() {
        const op = undoStack.pop();
        if (!op) { toast('没有可撤销的操作'); return; }
        lastOp = null;
        if (op.type === 'text') op.el.textContent = op.old;
        else if (op.old === '') dropIn(op.el, op.prop);
        else setIn(op.el, op.prop, op.old);
        if (op.el.isConnected && op.el !== selected) select(op.el); else placeBar();
    }

    function applyStyle(prop, value) {
        if (!selected) return;
        const old = getIn(selected, prop);
        setIn(selected, prop, value);
        pushOp({ type: 'style', el: selected, prop, old, new: value });
    }

    /* —— 选中与工具条定位 —— */
    function select(el) {
        if (selected === el) { placeBar(); return; }
        deselect();
        selected = el;
        el.classList.add(SEL);
        bar.hidden = false;
        placeBar();
    }
    function deselect() {
        commitText();
        if (selected) { selected.classList.remove(SEL); selected = null; }
        bar.hidden = true;
    }
    function placeBar() {
        if (!selected || bar.hidden) return;
        sizeReadout.textContent = Math.round(parseFloat(getComputedStyle(selected).fontSize)) || '';
        const r = selected.getBoundingClientRect();
        bar.style.left = Math.max(8, Math.min(innerWidth - bar.offsetWidth - 8, r.left)) + 'px';
        bar.style.top = Math.max(8, r.top - bar.offsetHeight - 8) + 'px';
    }

    /* —— 就地改字：dblclick 进入 plaintext-only，blur 提交 —— */
    let textBefore = null;
    function startText(el) {
        if (!el) return;
        commitText();
        select(el);
        el.contentEditable = 'plaintext-only';
        textBefore = { el, old: el.textContent };
        el.focus();
        placeBar();
    }
    function commitText() {
        if (!textBefore) return;
        const { el, old } = textBefore;
        textBefore = null;
        el.removeAttribute('contenteditable');
        const now = el.textContent;
        if (now !== old) pushOp({ type: 'text', el, prop: 'text', old, new: now });
    }

    /* —— 挪位：绝对定位改 left/top，流式改 margin（真实布局变化，可序列化）——
       对齐吸附：候选轴值接近同页其他元素/页面画布的边与中线时吸齐并画参考线（PPT 手感） */
    const SNAP = 5;
    const guides = ui('div');
    guides.className += ' deck-edit-guides';
    document.body.appendChild(guides);
    function showGuides(list) {                   // list: [{axis:'x'|'y', at: viewportPx, rect: slideRect}]
        guides.innerHTML = '';
        for (const g of list) {
            const line = document.createElement('i');
            line.className = g.axis === 'x' ? 'vg' : 'hg';
            if (g.axis === 'x') { line.style.left = g.at + 'px'; line.style.top = g.rect.top + 'px'; line.style.height = g.rect.height + 'px'; }
            else { line.style.top = g.at + 'px'; line.style.left = g.rect.left + 'px'; line.style.width = g.rect.width + 'px'; }
            guides.appendChild(line);
        }
    }
    function snapCandidates(el) {                 // 参考系：同页可见元素的边/中线 + 页面画布本身
        const slide = el.closest('section.slide');
        if (!slide) return { xs: [], ys: [], rect: slide?.getBoundingClientRect() };
        const rect = slide.getBoundingClientRect();
        const xs = [rect.left, rect.right, rect.left + rect.width / 2];
        const ys = [rect.top, rect.bottom, rect.top + rect.height / 2];
        for (const n of slide.querySelectorAll('*')) {
            if (n === el || el.contains(n) || n.closest('.deck-editor-ui')) continue;
            const r = n.getBoundingClientRect();
            if (r.width < 8 || r.height < 8) continue;
            const cs = getComputedStyle(n);
            if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
            xs.push(r.left, r.right, r.left + r.width / 2);
            ys.push(r.top, r.bottom, r.top + r.height / 2);
        }
        return { xs, ys, rect };
    }
    function snapAxis(el, axis, proposed) {       // proposed: 视口坐标；命中返回 {shift, guide}，否则 {}
        const { xs, ys, rect } = snapCache || snapCandidates(el);
        const cands = axis === 'x' ? xs : ys;
        const r = el.getBoundingClientRect();
        const cur = axis === 'x' ? r.left : r.top;
        const delta = proposed - cur;
        const mine = axis === 'x'
            ? [r.left + delta, r.right + delta, r.left + r.width / 2 + delta]
            : [r.top + delta, r.bottom + delta, r.top + r.height / 2 + delta];
        let best = null;
        for (const m of mine) for (const c of cands) {
            const d = Math.abs(m - c);
            if (d <= SNAP && (!best || d < best.d)) best = { d, at: c, shift: c - m };
        }
        return best ? { shift: best.shift, guide: { axis, at: best.at, rect } } : {};
    }
    let snapCache = null;                         // 一次拖拽手势内复用参考系（元素自身移动不影响他人）
    const moveProps = el => {
        const pos = getComputedStyle(el).position;
        return (pos === 'absolute' || pos === 'fixed')
            ? { x: 'left', y: 'top' }
            : { x: 'marginLeft', y: 'marginTop' };
    };
    /* —— 自由定位：流式元素首次拖动时转为 slide 内绝对定位（PPT 手感），逐属性可撤销 —— */
    function pinToSlide(el) {
        const slide = el.closest('section.slide');
        if (!slide) return;
        const s = slide.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const targetL = r.left - s.left, targetT = r.top - s.top;
        const touched = ['position', 'left', 'top', 'width', 'height', 'margin'];
        const olds = {};
        for (const p of touched) olds[p] = getIn(el, p);
        el.style.position = 'absolute';
        el.style.margin = '0';
        el.style.left = Math.round(targetL) + 'px';
        el.style.top = Math.round(targetT) + 'px';
        el.style.width = Math.round(r.width) + 'px';
        el.style.height = Math.round(r.height) + 'px';
        const r2 = el.getBoundingClientRect();                     // 偏移父级非 slide 时的一次校正
        el.style.left = Math.round(targetL + (s.left + targetL - r2.left)) + 'px';
        el.style.top = Math.round(targetT + (s.top + targetT - r2.top)) + 'px';
        for (const p of touched) {
            const now = getIn(el, p);
            if (now !== olds[p]) pushOp({ type: 'style', el, prop: p, old: olds[p], new: now });
        }
    }
    const px = v => Math.round(parseFloat(v) || 0);
    const curProp = (el, prop) => px(getIn(el, prop) || getComputedStyle(el)[prop]);
    /* 方向键=1px 精调不吸附（PPT 模型：吸附只在拖拽时生效，否则对齐点附近挪不开） */
    function moveBy(el, dx, dy) {
        const p = moveProps(el);
        stepMove(el, p.x, dx);
        stepMove(el, p.y, dy);
    }
    function stepMove(el, prop, d) {
        const old = getIn(el, prop);
        const next = curProp(el, prop) + d;
        setIn(el, prop, next + 'px');
        pushOp({ type: 'style', el, prop, old, new: next + 'px' });
    }

    /* —— 序列化：克隆上脱渲染（编辑器痕迹 + 运行态）， live DOM 不动 —— */
    function serializePristine() {
        const root = document.documentElement.cloneNode(true);
        root.querySelectorAll('[data-deck-editor]').forEach(n => n.remove());
        root.querySelectorAll('.deck-editor-ui').forEach(n => n.remove());
        root.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
        root.querySelectorAll('.fx-layer, .ambient-layer').forEach(n => n.remove());
        root.querySelectorAll('.deck-edit-sel').forEach(n => n.classList.remove('deck-edit-sel'));
        root.querySelectorAll('section.slide.current').forEach(n => n.classList.remove('current'));
        const thumbs = root.querySelector('#deckThumbs');
        if (thumbs) thumbs.innerHTML = '';
        root.querySelector('#deckSidebar')?.classList.remove('open');
        const pb = root.querySelector('#progressBar');
        if (pb) pb.style.width = '';
        for (const id of ['deckPage', 'playerHint', 'presCursorHint']) {
            const n = root.querySelector('#' + id);
            if (n) { n.textContent = ''; n.classList.remove('show'); }
        }
        const body = root.querySelector('body');
        if (body) body.className = 'browse';
        return '<!DOCTYPE html>\n' + root.outerHTML;
    }
    const docName = () => {
        try { return decodeURIComponent(location.pathname.split('/').pop()) || 'deck.html'; }
        catch { return 'deck.html'; }
    };
    function save() {                                   // 三通道：deck-serve 写回 / Chromium 直接写回原文件 / 下载
        commitText();
        if (window.__DECK_SERVE) return saveServe();
        if (window.showSaveFilePicker) return saveFsAccess();
        saveDownload();
    }
    function saveServe() {
        initSSE();
        toast('保存中…', true);
        fetch(window.__DECK_SERVE.save, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ html: serializePristine() }),
        }).then(r => r.json()).then(res => {
            if (!res.ok) toast('保存被拒：' + res.error, false);
            else toast('已写回 · ' + (res.note || ''), true);      // reload 事件通常先到，刷新后由 SSE 补溢出结果
        }).catch(e => toast('保存失败：' + e.message, false));
    }
    async function saveFsAccess() {                     // Chromium：系统另存对话框（替换原文件），无需服务
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: docName(),
                types: [{ description: 'deck HTML', accept: { 'text/html': ['.html'] } }],
            });
            const w = await handle.createWritable();
            await w.write(serializePristine());
            await w.close();
            const hint = overflowHint();
            toast('已保存到原文件 · 结构性修改（增删页/改图）请走对话' + (hint ? '。⚠ ' + hint : ''), !hint);
        } catch (e) {
            if (e && e.name === 'AbortError') { toast('已取消保存'); return; }
            toast('此浏览器不支持直接写回，已改为下载', false);
            saveDownload();
        }
    }
    function overflowHint() {                          // 客户端通道无完整门禁：轻量自检兜住无声裁切
        const slides = [...document.querySelectorAll('section.slide')];
        const bad = slides.findIndex(sl => sl.scrollHeight > sl.clientHeight + 6 || sl.scrollWidth > sl.clientWidth + 6);
        return bad < 0 ? '' : `第 ${bad + 1} 页内容可能超出画布——建议回 deck-serve 保存以运行完整门禁`;
    }
    function saveDownload() {                           // 兜底：下载编辑后的 HTML（替换原文件；演示可直接 ⤓ 导出 PPTX）
        const blob = new Blob([serializePristine()], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = docName();
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        const hint = overflowHint();
        toast('已下载编辑后的 HTML：请替换原文件（仅演示用可改为 ⤓ 导出 PPTX）' + (hint ? '。⚠ ' + hint : ''), !hint);
    }

    /* —— 模式切换 —— */
    function toggle(force) {
        const on = force === undefined ? !editing() : force;
        if (on && document.body.classList.contains('presenting')) { toast('先退出放映（F）再编辑', false); return; }
        if (!on) {
            svgInput?.blur();                                      // 待提交的 SVG 编辑先走 blur 提交
            deselect();
            drag = null;
            snapCache = null;
            guides.innerHTML = '';
        }
        document.body.classList.toggle(EDITING, on);
        pill.textContent = on ? '✓ 编辑中（E 退出 · Ctrl+S 保存）' : '✏️ 编辑（E）';
        if (on) toast('编辑态：点文字直接改 · 单击选中拖拽挪位 · Ctrl+S 保存', true);
    }

    /* —— 事件 —— */
    document.addEventListener('click', e => {
        if (!editing()) return;
        if (e.target.closest('.deck-editor-ui')) return;           // 编辑器 UI 自身正常工作
        commitText();
        if (skippable(e.target)) { deselect(); return; }           // 点空白/引擎 chrome：提交并取消选中
        e.stopPropagation(); e.preventDefault();                   // 页面内容：编辑接管
        select(e.target);
        if (e.detail === 2) startText(e.target);                   // 双击 = 就地改字（mousedown 已被接管，detail 原样保留）
    }, true);

    /* —— SVG 文字受限编辑：contenteditable 对 SVG 无效，覆盖输入框改 textContent。
       仅限纯文本 <text>；含 tspan 等子元素的多段定位结构一动就塌，引导走对话 —— */
    let svgInput = null;
    function svgTextEdit(textEl) {
        if (textEl.querySelector('*')) { toast('多段 SVG 文本（含 tspan 定位）请走对话修改', false); return; }
        commitText();
        select(textEl);
        const r = textEl.getBoundingClientRect();
        svgInput = document.createElement('input');
        svgInput.className = 'deck-editor-ui deck-edit-svg-input';
        svgInput.value = textEl.textContent;
        svgInput.style.left = r.left + 'px';
        svgInput.style.top = r.top + 'px';
        svgInput.style.width = Math.max(120, r.width + 48) + 'px';
        svgInput.style.height = Math.max(24, r.height) + 'px';
        svgInput.style.fontSize = Math.max(12, r.height * 0.72) + 'px';
        document.body.appendChild(svgInput);
        svgInput.focus();
        svgInput.select();
        let done = false;
        const finish = keep => {
            if (done || !svgInput) return;
            done = true;
            const val = svgInput.value;
            svgInput.remove();
            svgInput = null;
            if (!keep || val === textEl.textContent) return;
            pushOp({ type: 'text', el: textEl, prop: 'text', old: textEl.textContent, new: val });
            textEl.textContent = val;
        };
        svgInput.addEventListener('keydown', e => {
            e.stopPropagation();                                       // 输入框内按键不外溢（播放器/编辑器快捷键均不触发）
            if (e.key === 'Enter') finish(true);
            else if (e.key === 'Escape') finish(false);
        });
        svgInput.addEventListener('blur', () => finish(true));
    }

    document.addEventListener('dblclick', e => {
        if (!editing()) return;
        if (e.target.closest('.deck-editor-ui')) return;
        const svgText = e.target.closest('text');                  // SVG 文字（HTML 无 text 标签，不误伤）
        if (svgText) { e.stopPropagation(); e.preventDefault(); svgTextEdit(svgText); return; }
        if (skippable(e.target)) return;
        e.stopPropagation(); e.preventDefault();
        startText(e.target);
    }, true);

    document.addEventListener('mousedown', e => {
        if (!editing() || typing() || e.button !== 0) return;
        if (e.target.closest('.deck-editor-ui') || skippable(e.target)) return;
        commitText();
        const el = (selected && (e.target === selected || selected.contains(e.target))) ? selected : e.target;   // 按住即拖，无需先选中
        const p = moveProps(el);
        drag = { el, pxp: p.x, pyp: p.y, sx: e.clientX, sy: e.clientY,
                 ox: curProp(el, p.x), oy: curProp(el, p.y),
                 moved: false, olds: null };
        e.stopPropagation();                                       // 阻断播放器等监听；不可 preventDefault——会吞 click/dblclick
    }, true);
    document.addEventListener('mousemove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) < 3) return;
        if (!drag.moved) {                                         // 首次真拖：流式元素先转为自由定位，再记录原值供撤销
            drag.moved = true;
            const pos = getComputedStyle(drag.el).position;
            if (pos !== 'absolute' && pos !== 'fixed') pinToSlide(drag.el);
            const p2 = moveProps(drag.el);
            drag.pxp = p2.x; drag.pyp = p2.y;
            drag.ox = curProp(drag.el, drag.pxp); drag.oy = curProp(drag.el, drag.pyp);
            drag.olds = { [drag.pxp]: getIn(drag.el, drag.pxp), [drag.pyp]: getIn(drag.el, drag.pyp) };
            document.body.style.userSelect = 'none';               // 拖拽期间压住原生选字
            snapCache = snapCandidates(drag.el);
        }
        const r = drag.el.getBoundingClientRect();
        const hits = [];
        let sdx = dx, sdy = dy;
        const hx = snapAxis(drag.el, 'x', r.left + dx);
        if (hx.shift !== undefined) { sdx = dx + hx.shift; hits.push(hx.guide); }
        const hy = snapAxis(drag.el, 'y', r.top + dy);
        if (hy.shift !== undefined) { sdy = dy + hy.shift; hits.push(hy.guide); }
        showGuides(hits);                                          // 拖拽中参考线常驻，松手即清
        setIn(drag.el, drag.pxp, drag.ox + sdx + 'px');
        setIn(drag.el, drag.pyp, drag.oy + sdy + 'px');
        placeBar();
    }, true);
    document.addEventListener('mouseup', () => {
        if (!drag) return;
        const d = drag; drag = null;
        snapCache = null;
        document.body.style.userSelect = '';
        guides.innerHTML = '';
        if (!d.moved) return;
        for (const prop of [d.pxp, d.pyp])
            pushOp({ type: 'style', el: d.el, prop, old: d.olds[prop], new: getIn(d.el, prop) });
    }, true);

    document.addEventListener('keydown', e => {
        const k = e.key;
        const saveKeys = (e.ctrlKey || e.metaKey) && (k === 's' || k === 'S');
        if (typing()) {
            if (saveKeys) { e.stopPropagation(); e.preventDefault(); save(); return; }   // 保存优先于改字（Word 同款）
            if (k === 'Escape') { commitText(); document.activeElement.blur(); e.stopPropagation(); e.preventDefault(); return; }
            e.stopPropagation();                                       // 其余按键只属于文字（并屏蔽播放器快捷键）
            return;
        }
        if (k === 'e' || k === 'E') { e.stopPropagation(); e.preventDefault(); toggle(); return; }   // E 进/出编辑态（观景态即可进入）
        if (!editing()) return;
        if (saveKeys) { e.stopPropagation(); e.preventDefault(); save(); return; }
        if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.stopPropagation(); e.preventDefault(); undo(); return; }
        if (k === 'Escape') { commitText(); deselect(); e.stopPropagation(); return; }
        if (k === ' ' && selected) { e.stopPropagation(); e.preventDefault(); return; }   // 空格不翻页
        const step = e.shiftKey ? 10 : 1;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
        if (d && selected) { e.stopPropagation(); e.preventDefault(); moveBy(selected, d[0], d[1]); }
    }, true);

    addEventListener('resize', placeBar);
    document.addEventListener('blur', () => commitText(), true);

    /* —— 放映态：自动退出编辑（否则方向键会在观众面前隐形挪元素）—— */
    new MutationObserver(() => {
        if (document.body.classList.contains('presenting') && editing()) {
            toast('已退出编辑进入放映', true);
            toggle(false);
        }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    /* —— SSE：门禁结果 toast；保存成功后服务端广播刷新。
       bootstrap 在 body 尾部（晚于本脚本求值），故 load 时再初始化，saveServe 兜底重试 —— */
    let es = null;
    function initSSE() {
        if (es || !window.__DECK_SERVE || !('EventSource' in window)) return;
        es = new EventSource(window.__DECK_SERVE.events);
        es.addEventListener('gate', e => {
            const g = JSON.parse(e.data);
            toast((g.tool === 'overflow' ? '溢出门禁：' : '门禁：') + g.summary, g.ok);
        });
        es.addEventListener('reload', () => location.reload());
    }
    initSSE();
    addEventListener('load', initSSE, { once: true });
    if (new URLSearchParams(location.search).has('edit')) toggle(true);
})();
