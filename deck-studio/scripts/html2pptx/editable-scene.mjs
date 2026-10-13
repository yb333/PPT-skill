// 此函数在浏览器内执行；保持自包含，兼容 Chrome 与桌面 Host 渲染服务。
export function collectEditableScene(slideIndex) {
  const canvas = document.querySelectorAll('section.slide')[slideIndex];   // deck-studio 契约
  const bounds = canvas.getBoundingClientRect();
  const sx = 1920 / bounds.width, sy = 1080 / bounds.height;
  const fontScale = 1920 / canvas.offsetWidth;
  const elements = [], warnings = new Set(), targets = [], paint = [];
  const order = new Map([canvas, ...canvas.querySelectorAll('*')].map((el, index) => [el, index]));
  const box = rect => ({ x: (rect.left - bounds.left) * sx, y: (rect.top - bounds.top) * sy, width: rect.width * sx, height: rect.height * sy });
  const visibleRect = rect => rect.width > 0 && rect.height > 0 && rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom;
  function color(value) {
    const parts = value?.match(/[\d.]+/g)?.map(Number);
    if (!parts || parts.length < 3) return { hex: '000000', alpha: 0 };
    return { hex: parts.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase(), alpha: parts[3] ?? 1 };
  }
  const px = value => parseFloat(value) || 0;
  function uniformScale(style) {
    if (style.scale === 'none') return 1;
    const [x, y = x, z = 1] = style.scale.split(/\s+/).map(Number);
    return x > 0 && x === y && z === 1 ? x : null;
  }
  const zoomCache = new Map();
  function localZoom(element) {
    if (!element || element === canvas || !canvas.contains(element)) return 1;
    if (!zoomCache.has(element)) {
      const style = getComputedStyle(element);
      zoomCache.set(element, (parseFloat(style.zoom) || 1) * (uniformScale(style) ?? 1) * localZoom(element.parentElement));
    }
    return zoomCache.get(element);
  }
  const pixelScale = element => canvas.contains(element) ? fontScale * localZoom(element) : sx;
  const textMetrics = document.createElement('canvas').getContext('2d');
  const contextCache = new Map();
  function context(element) {
    if (!element || element === canvas || !canvas.contains(element)) return [];
    if (contextCache.has(element)) return contextCache.get(element);
    const style = getComputedStyle(element), parent = context(element.parentElement);
    const stacking = (style.zIndex !== 'auto' && (style.position !== 'static' || ['flex', 'grid'].includes(getComputedStyle(element.parentElement).display))) || ['fixed', 'sticky'].includes(style.position) || style.isolation === 'isolate' || style.transform !== 'none' || style.scale !== 'none' || Number(style.opacity) < 1 || style.filter !== 'none' || style.mixBlendMode !== 'normal';
    const z = parseInt(style.zIndex, 10) || 0;
    const key = stacking ? [...parent, z < 0 ? 1 : z > 0 ? 4 : 3, z, order.get(element)] : parent;
    contextCache.set(element, key); return key;
  }
  function emit(item, owner, background = false) {
    // z-index 归属最近 stacking context，而非 DOM 父节点；保留跨父节点的定位层级。
    const ownContext = context(owner), parentContext = context(owner.parentElement);
    let phase = 2;
    for (let ancestor = owner; ancestor && ancestor !== canvas; ancestor = ancestor.parentElement) {
      if (context(ancestor).length < ownContext.length) break;
      if (getComputedStyle(ancestor).position !== 'static') { phase = 3; break; }
    }
    if (background && (owner === canvas || ownContext.length > parentContext.length)) phase = 0;
    const key = [...ownContext, phase, 0, paint.length];
    paint.push({ item, key });
  }
  function font(style, element) {
    const ink = color(style.color);
    const scale = pixelScale(element);
    return {
      // 网页字体不随 PPTX 嵌入，统一微软雅黑，避免 Office 随机回退成宋体等字体。
      fontFamily: 'Microsoft YaHei',
      fontSize: Math.max(2, px(style.fontSize) * scale), color: ink.hex, opacity: ink.alpha,
      bold: Number(style.fontWeight) >= 600 || style.fontWeight === 'bold', italic: style.fontStyle === 'italic',
      underline: style.textDecorationLine.includes('underline'), charSpacing: px(style.letterSpacing) * scale,
    };
  }
  function textLines(node, keepWhitespace = false) {
    const style = getComputedStyle(node.parentElement);
    if (style.visibility !== 'visible' || color(style.color).alpha === 0) return [];
    const range = document.createRange(), lines = [];
    let offset = 0;
    // 逐码点测量实际换行，避免把中文、混合字体或自动换行交给 Office 再排一次。
    for (const character of node.textContent) {
      range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
      const rect = range.getBoundingClientRect();
      if (!visibleRect(rect) || rect.width < 0.01) continue;
      let line = lines.at(-1);
      if (!line || Math.abs(line.top - rect.top) > 2 || rect.left < line.left - 2) {
        line = { text: '', left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        lines.push(line);
      }
      line.text += /[\r\n\t]/.test(character) && !style.whiteSpace.startsWith('pre') ? ' ' : character;
      line.right = Math.max(line.right, rect.right); line.bottom = Math.max(line.bottom, rect.bottom);
    }
    return lines.filter(line => keepWhitespace || line.text.trim()).map(line => {
      let text = line.text;
      if (style.textTransform === 'uppercase') text = text.toUpperCase();
      if (style.textTransform === 'lowercase') text = text.toLowerCase();
      if (style.textTransform === 'capitalize') text = text.replace(/\b\p{L}/gu, c => c.toUpperCase());
      const geometry = box({ ...line, width: line.right - line.left, height: line.bottom - line.top });
      const run = { text, ...font(style, node.parentElement) };
      // Range 顶部包含网页字体 ascent 留白。按实际基线定位，避免换字体后整体上移。
      textMetrics.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ascent = textMetrics.measureText(text).fontBoundingBoxAscent;
      if (Number.isFinite(ascent)) geometry.y += ascent * pixelScale(node.parentElement) - run.fontSize;
      return { type: 'text', ...geometry, width: geometry.width + 2, wrap: false,
        paragraphs: [{ align: 'left', runs: [run] }] };
    });
  }
  function raster(element, kind = 'subtree', reason = '') {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (!visibleRect(rect)) return;
    const padding = { left: 0, top: 0, right: 0, bottom: 0 };
    for (const shadow of (style.boxShadow + ',' + style.textShadow).replace(/rgba?\([^)]*\)/g, '').split(',')) {
      if (shadow.includes('inset')) continue;
      const values = shadow.match(/-?[\d.]+px/g)?.map(px);
      if (!values || values.length < 2) continue;
      const [x, y, blur = 0, spread = 0] = values, extent = Math.max(0, blur * 1.5 + spread);
      padding.left = Math.max(padding.left, extent - x); padding.right = Math.max(padding.right, extent + x);
      padding.top = Math.max(padding.top, extent - y); padding.bottom = Math.max(padding.bottom, extent + y);
    }
    const zoom = localZoom(element), factor = bounds.width / canvas.offsetWidth * zoom;
    const area = { left: Math.max(bounds.left, rect.left - padding.left * factor), top: Math.max(bounds.top, rect.top - padding.top * factor), right: Math.min(bounds.right, rect.right + padding.right * factor), bottom: Math.min(bounds.bottom, rect.bottom + padding.bottom * factor) };
    area.width = area.right - area.left; area.height = area.bottom - area.top;
    const target = targets.push({ element, kind, padding, zoom }) - 1;
    emit({ type: 'image', ...box(area), target }, element, kind === 'background');
    if (reason) warnings.add(reason);
  }
  function simpleTable(table) {
    const rows = [...table.rows];
    if (!rows.length || !rows[0].cells.length || rows.some(row => row.cells.length !== rows[0].cells.length || [...row.cells].some(cell => cell.colSpan !== 1 || cell.rowSpan !== 1 || cell.querySelector('img,svg,canvas,table')))) return false;
    if ([table, ...table.querySelectorAll('*')].some(el => {
      const style = getComputedStyle(el);
      return style.backgroundImage !== 'none' || style.boxShadow !== 'none' || style.textShadow !== 'none' || style.transform !== 'none' || Number(style.opacity) < 1;
    })) return false;
    const result = { type: 'table', ...box(table.getBoundingClientRect()), columns: [...rows[0].cells].map(cell => cell.getBoundingClientRect().width * sx), rows: [] };
    for (const [rowIndex, row] of rows.entries()) {
      const cells = [];
      for (const [columnIndex, cell] of [...row.cells].entries()) {
        const style = getComputedStyle(cell);
        const scale = pixelScale(cell);
        const lines = [];
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          lines.push(...textLines(node, true));
        }
        const paragraphs = [];
        let previous;
        for (const line of lines) {
          if (previous && Math.abs(previous.y - line.y) < Math.max(3, line.height * 0.3)) previous.paragraph.runs.push(...line.paragraphs[0].runs);
          else {
            const paragraph = { ...line.paragraphs[0], align: ['left', 'center', 'right'].includes(style.textAlign) ? style.textAlign : 'left' };
            paragraphs.push(paragraph); previous = { y: line.y, paragraph };
          }
        }
        const entry = { paragraphs, wrap: false, marginTop: px(style.paddingTop) * scale, marginRight: px(style.paddingRight) * scale,
          marginBottom: px(style.paddingBottom) * scale, marginLeft: px(style.paddingLeft) * scale,
          verticalAlign: style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'bottom' : 'top' };
        // 表格的背景常写在 tr/table 上；合成到每个单元格，保留白字深底等组合。
        const backgrounds = [];
        for (let ancestor = cell; ancestor; ancestor = ancestor.parentElement) {
          const layer = color(getComputedStyle(ancestor).backgroundColor); backgrounds.unshift(layer);
          if (layer.alpha === 1) break;
        }
        let rgb = [255, 255, 255];
        for (const layer of backgrounds) rgb = rgb.map((n, index) => Math.round(parseInt(layer.hex.slice(index * 2, index * 2 + 2), 16) * layer.alpha + n * (1 - layer.alpha)));
        entry.fill = rgb.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
        for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
          const atEdge = side === 'Top' ? rowIndex === 0 : side === 'Bottom' ? rowIndex === rows.length - 1 : side === 'Left' ? columnIndex === 0 : columnIndex === row.cells.length - 1;
          const candidates = [cell, ...(['Top', 'Bottom'].includes(side) || atEdge ? [row] : []), ...(atEdge ? [table] : [])].map(node => getComputedStyle(node));
          // 合并边框时较粗的外框优先，不能总取单元格较细的灰线。
          if (getComputedStyle(table).borderCollapse === 'collapse') candidates.sort((a, b) => px(b[`border${side}Width`]) - px(a[`border${side}Width`]));
          const borderStyle = candidates.find(s => px(s[`border${side}Width`]) && color(s[`border${side}Color`]).alpha);
          if (borderStyle) entry[`border${side}`] = { color: color(borderStyle[`border${side}Color`]).hex, width: px(borderStyle[`border${side}Width`]) * scale };
        }
        cells.push(entry);
      }
      result.rows.push({ height: row.getBoundingClientRect().height * sy, cells });
    }
    // Office 的共享边可能被相邻单元格的 noFill 覆盖；把合并后的线同步到两侧。
    for (let row = 0; row < result.rows.length; row++) {
      for (let column = 0; column < result.columns.length; column++) {
        const cell = result.rows[row].cells[column];
        const merge = (neighbor, ownSide, neighborSide) => {
          const first = cell[ownSide], second = neighbor[neighborSide];
          const border = !first ? second : !second || first.width >= second.width ? first : second;
          if (border) { cell[ownSide] = border; neighbor[neighborSide] = border; }
        };
        if (row + 1 < result.rows.length) merge(result.rows[row + 1].cells[column], 'borderBottom', 'borderTop');
        if (column + 1 < result.columns.length) merge(result.rows[row].cells[column + 1], 'borderRight', 'borderLeft');
      }
    }
    emit(result, table); return true;
  }
  function svgPaint(value, defs) {
    if (!value || value === 'none') return null;
    if (value.startsWith('url(')) {
      const id = value.replace(/url\(#([^)]+)\)/, '$1');
      return defs.get(id) || null;                       // { from, to } 渐变
    }
    let hex = value.trim();
    if (hex.startsWith('#')) {
      if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
      return { hex: hex.slice(1).toUpperCase(), alpha: 1 };
    }
    const rgb = color(value);
    return rgb.alpha ? rgb : null;
  }
  /* SVG 图表分解：rect/line/text → 原生形状/连接线/文本框（可编辑）；path 弧线走抠图。
     坐标：viewBox 用户单位 × 缩放映射到画布，再复用 box() 换算场景坐标。 */
  function parsePathD(d) {
    /* deck 图表词汇表：绝对坐标 M/L/H/V/Q/Z（弧线=带 Q 拐角的折线或二次曲线） */
    const tokens = d.match(/[MLHVQZ]|-?[\d.]+/g) || [];
    const segs = [];
    let i = 0, cx = 0, cy = 0, start = [0, 0];
    const num = () => parseFloat(tokens[i++]);
    while (i < tokens.length) {
      const cmd = tokens[i++];
      if (cmd === 'M') { cx = num(); cy = num(); start = [cx, cy]; segs.push({ t: 'M', p: [cx, cy] }); }
      else if (cmd === 'L') { cx = num(); cy = num(); segs.push({ t: 'L', p: [cx, cy] }); }
      else if (cmd === 'H') { cx = num(); segs.push({ t: 'L', p: [cx, cy] }); }
      else if (cmd === 'V') { cy = num(); segs.push({ t: 'L', p: [cx, cy] }); }
      else if (cmd === 'Q') { const c = [num(), num()], p2 = [num(), num()]; cx = p2[0]; cy = p2[1]; segs.push({ t: 'Q', c, p: p2 }); }
      else if (cmd === 'Z') { segs.push({ t: 'Z' }); cx = start[0]; cy = start[1]; }
    }
    return segs;
  }
  function visitSvg(svg) {
    if (svg.classList.contains('fx-layer') || svg.classList.contains('ambient-layer')) return;   // 动画层不进快照
    const rect0 = svg.getBoundingClientRect();
    if (!visibleRect(rect0)) return;
    const vb = svg.viewBox.baseVal;
    if (!vb.width || !vb.height) return;
    const ux = rect0.width / vb.width, uy = rect0.height / vb.height;
    const defs = new Map();
    for (const g of svg.querySelectorAll('linearGradient')) {
      const stops = [...g.querySelectorAll('stop')].map(stop => svgPaint(stop.getAttribute('stop-color'), defs));
      const solid = stops.filter(Boolean);
      defs.set(g.id, solid.length >= 2 ? { from: solid[0].hex, to: solid[solid.length - 1].hex } : null);
    }
    const canvasRect = vr => {
      const left = (vr.left - bounds.left) * sx, top = (vr.top - bounds.top) * sy;
      return { x: left, y: top, width: vr.width * sx, height: vr.height * sy };
    };
    const vrOf = (x, y, w, h) => ({ left: rect0.left + x * ux, top: rect0.top + y * uy, width: w * ux, height: h * uy });
    for (const node of svg.querySelectorAll('rect, circle, ellipse, line, text, path')) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || node.closest('defs')) continue;
      const tag = node.tagName;
      if (tag === 'circle' || tag === 'ellipse') {
        const isCircle = tag === 'circle';
        const cx = px(node.getAttribute('cx')), cy = px(node.getAttribute('cy'));
        const rx = isCircle ? px(node.getAttribute('r')) : px(node.getAttribute('rx'));
        const ry = isCircle ? px(node.getAttribute('r')) : px(node.getAttribute('ry'));
        if (rx <= 0 || ry <= 0) continue;
        const fill = svgPaint(node.getAttribute('fill'), defs);
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        const sw = px(node.getAttribute('stroke-width')) || 1;
        const shape = { type: 'shape', ...canvasRect(vrOf(cx - rx, cy - ry, rx * 2, ry * 2)), geometry: 'ellipse' };
        if (fill && fill.from) shape.gradient = fill;
        else if (fill) { shape.fill = fill.hex; shape.opacity = fill.alpha; }
        if (stroke && sw > 0) shape.border = { color: stroke.hex, opacity: stroke.alpha, width: sw * ux, dash: !!node.getAttribute('stroke-dasharray') };
        emit(shape, node, true);
      } else if (tag === 'rect') {
        const x = px(node.getAttribute('x')), y = px(node.getAttribute('y'));
        const w = px(node.getAttribute('width')), h = px(node.getAttribute('height'));
        if (w <= 0 || h <= 0) continue;
        const rx = px(node.getAttribute('rx'));
        const fill = svgPaint(node.getAttribute('fill'), defs);
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        const sw = px(node.getAttribute('stroke-width')) || 1;
        const shape = { type: 'shape', ...canvasRect(vrOf(x, y, w, h)), geometry: rx > 0 ? 'roundRect' : 'rect', radius: rx * ux };
        if (fill && fill.from) shape.gradient = fill;
        else if (fill) { shape.fill = fill.hex; shape.opacity = fill.alpha; }
        if (stroke && sw > 0) shape.border = { color: stroke.hex, opacity: stroke.alpha, width: sw * ux, dash: !!node.getAttribute('stroke-dasharray') };
        emit(shape, node, true);
      } else if (tag === 'line') {
        const x1 = px(node.getAttribute('x1')), y1 = px(node.getAttribute('y1'));
        const x2 = px(node.getAttribute('x2')), y2 = px(node.getAttribute('y2'));
        const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
        if (width < 0.01 && height < 0.01) continue;
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        if (!stroke) continue;
        const shape = { type: 'shape', ...canvasRect(vrOf(Math.min(x1, x2), Math.min(y1, y2), width, height)),
          geometry: 'line', stroke: { color: stroke.hex, width: (px(node.getAttribute('stroke-width')) || 1.5) * ux },
          arrow: node.hasAttribute('marker-end'), dash: !!node.getAttribute('stroke-dasharray'),
          flipH: x2 < x1, flipV: y2 < y1 };
        emit(shape, node, true);
      } else if (tag === 'text') {
        const content = node.textContent.trim();
        if (!content) continue;
        const x = px(node.getAttribute('x')), y = px(node.getAttribute('y'));
        const fontSize = (px(node.getAttribute('font-size')) || parseFloat(getComputedStyle(node).fontSize) || 10) * uy;
        const weight = Number(node.getAttribute('font-weight') || getComputedStyle(node).fontWeight || 400);
        const fill = svgPaint(node.getAttribute('fill') || getComputedStyle(node).fill, defs);
        const w = (textMetrics.font = `${getComputedStyle(node).fontWeight} ${getComputedStyle(node).fontSize} ${getComputedStyle(node).fontFamily}`, textMetrics.measureText(content).width) * ux;
        const anchor = node.getAttribute('text-anchor') || 'start';
        const xvp = rect0.left + x * ux, yvp = rect0.top + y * uy;
        const left = anchor === 'middle' ? xvp - w / 2 : anchor === 'end' ? xvp - w : xvp;
        const height = fontSize * 1.35;
        const text = { type: 'text', ...canvasRect({ left, top: yvp - fontSize * 0.85, width: w, height }), width: w + 2, wrap: false,
          paragraphs: [{ align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
            runs: [{ text: content, fontFamily: 'Microsoft YaHei', fontSize, color: fill ? fill.hex : '000000', opacity: fill ? fill.alpha : 1, bold: weight >= 600 }] }] };
        emit(text, node);
      } else if (tag === 'path') {
        const d = node.getAttribute('d');
        if (!d) continue;
        const segs = parsePathD(d);
        if (segs.length < 2) continue;
        const pts = [];
        for (const sg of segs) { pts.push(sg.p); if (sg.c) pts.push(sg.c); }
        const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
        const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        if (!stroke) continue;
        const rel = vrOf(minX, minY, maxX - minX, maxY - minY);
        const origin = [rect0.left + minX * ux, rect0.top + minY * uy];
        const relSegs = segs.map(sg => {
          const relPt = p => [Math.round((p[0] - minX) * ux * 100) / 100, Math.round((p[1] - minY) * uy * 100) / 100];
          const out = { t: sg.t, p: relPt(sg.p) };
          if (sg.c) out.c = relPt(sg.c);
          return out;
        });
        const shape = { type: 'freeform', ...canvasRect(rel), segs: relSegs,
          stroke: { color: stroke.hex, width: (px(node.getAttribute('stroke-width')) || 1.5) * ux, dash: !!node.getAttribute('stroke-dasharray') } };
        emit(shape, node, true);
      }
    }
  }
  function visit(element) {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(element.tagName) || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
    const pseudos = ['::before', '::after'].map(which => getComputedStyle(element, which)).filter(p => p.display !== 'none' && !['none', 'normal'].includes(p.content));
    if (element !== canvas) {
      const matrix = style.transform !== 'none' ? new DOMMatrix(style.transform) : null;
      const transformed = uniformScale(style) === null || (matrix && (Math.abs(matrix.a - 1) > 0.001 || Math.abs(matrix.d - 1) > 0.001 || Math.abs(matrix.b) > 0.001 || Math.abs(matrix.c) > 0.001 || !matrix.is2D));
      const clipped = (['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 2) || (['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2);
      const pseudo = pseudos.some(p => p.content !== '""');
      if (element.tagName === 'svg') { visitSvg(element); return; }   // SVG 图表分解为原生可编辑对象
      if (['CANVAS', 'IMG', 'VIDEO', 'IFRAME', 'OBJECT'].includes(element.tagName) || transformed || clipped || pseudo || Number(style.opacity) < 1 || style.filter !== 'none' || style.clipPath !== 'none' || style.maskImage !== 'none' || style.mixBlendMode !== 'normal' || px(style.webkitTextStrokeWidth) > 0) {   // text-shadow 不再触发转图片：阴影丢弃，文字保持可编辑
        raster(element, 'subtree', '复杂图形或特殊效果已保留为图片'); return;
      }
    }
    if (element.tagName === 'TABLE') {
      if (!simpleTable(element)) raster(element, 'subtree', '含合并单元格或图形的表格已保留为图片');
      return;
    }
    if (visibleRect(rect)) {
      const fill = color(style.backgroundColor), border = color(style.borderTopColor);
      const widths = ['Top', 'Right', 'Bottom', 'Left'].map(side => px(style[`border${side}Width`]));
      const radii = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(corner => px(style[`border${corner}Radius`]));
      const uniformBorder = widths.every(w => w === widths[0]) && ['Right', 'Bottom', 'Left'].every(side => style[`border${side}Color`] === style.borderTopColor && style[`border${side}Style`] === style.borderTopStyle);
      const complex = pseudos.length > 0 || style.backgroundImage !== 'none' || style.boxShadow !== 'none' || !radii.every(r => r === radii[0]) || (!uniformBorder && widths.some(Boolean)) || (widths.some(Boolean) && !['solid', 'none'].includes(style.borderTopStyle));
      if (complex) raster(element, 'background', '复杂背景效果已保留为图片');
      else if (fill.alpha || widths.some(Boolean)) {
        const geometry = box(rect);
        const ellipse = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].every(corner => getComputedStyle(element)[`border${corner}Radius`] === '50%');
        const shape = { type: 'shape', ...geometry, geometry: ellipse ? 'ellipse' : radii[0] ? 'roundRect' : 'rect', radius: radii[0] * pixelScale(element) };
        if (fill.alpha) { shape.fill = fill.hex; shape.opacity = fill.alpha; }
        if (widths[0] && border.alpha) shape.border = { color: border.hex, opacity: border.alpha, width: widths[0] * pixelScale(element) };
        emit(shape, element, true);
      }
    }
    // 普通布局按 DOM 绘制；定位元素依 z-index 排序，图片兜底仍处于对应层级。
    const nodes = [...element.childNodes].sort((a, b) => {
      const z = node => node.nodeType === Node.ELEMENT_NODE ? (parseInt(getComputedStyle(node).zIndex, 10) || 0) : 0;
      return z(a) - z(b);
    });
    for (const child of nodes) {
      if (child.nodeType === Node.ELEMENT_NODE) visit(child);
      else if (child.nodeType === Node.TEXT_NODE) for (const line of textLines(child)) emit(line, element);
    }
  }
  // 画布透明时保留祖先的平面底色。
  let backdrop = canvas;
  while (backdrop && !color(getComputedStyle(backdrop).backgroundColor).alpha) backdrop = backdrop.parentElement;
  elements.push({ type: 'shape', x: 0, y: 0, width: 1920, height: 1080, geometry: 'rect', fill: backdrop ? color(getComputedStyle(backdrop).backgroundColor).hex : 'FFFFFF' });
  visit(canvas);
  // 模板品牌标识位于画布外、以 fixed 方式显示；作为独立图片保留。
  for (const logo of document.querySelectorAll('img[alt="HUAWEI"],img[data-brand-logo]')) {
    if (!canvas.contains(logo) && visibleRect(logo.getBoundingClientRect()) && getComputedStyle(logo).display !== 'none') {
      raster(logo); paint.at(-1).key = [Infinity];
    }
  }
  // 历史模板保密页脚也是 fixed 外壳元素；新模板可用显式品牌页脚属性。
  for (const footer of document.querySelectorAll('[data-brand-footer],.app > div')) {
    if (canvas.contains(footer) || (footer.textContent.trim() !== 'Huawei Confidential' && !footer.hasAttribute('data-brand-footer'))
      || getComputedStyle(footer).position !== 'fixed') continue;
    const start = paint.length;
    visit(footer);
    for (const entry of paint.slice(start)) entry.key = [Infinity];
  }
  paint.sort((a, b) => {
    for (let index = 0; index < Math.max(a.key.length, b.key.length); index++) {
      const delta = (a.key[index] ?? 0) - (b.key[index] ?? 0);
      if (delta) return delta;
    }
    return 0;
  });
  elements.push(...paint.map(entry => entry.item));
  window.__aicoEditableCapture = { targets, canvas };
  return { name: canvas.querySelector('section[data-label]')?.getAttribute('data-label') || `第 ${slideIndex + 1} 页`, elements, warnings: [...warnings] };
}

// 临时遮去背景对象上的文字与子元素，只影响本次独立渲染进程，不改动源 HTML。
export function prepareEditableCapture(targetIndex) {
  const { targets, canvas } = window.__aicoEditableCapture;
  const target = targets[targetIndex], element = target.element;
  const restores = [];
  const change = (node, property, value) => {
    restores.push([node, property, node.style.getPropertyValue(property), node.style.getPropertyPriority(property)]);
    node.style.setProperty(property, value, 'important');
  };
  const showing = target.kind === 'background' ? [element] : [element, ...element.querySelectorAll('*')].filter(el => getComputedStyle(el).visibility === 'visible');
  const style = document.createElement('style');
  style.textContent = 'html,body{background:transparent!important}body *{visibility:hidden!important}[data-aico-export-visible]{visibility:visible!important}';
  for (const el of showing) el.setAttribute('data-aico-export-visible', '');
  document.head.append(style);
  if (target.kind === 'background') {
    change(element, '-webkit-text-fill-color', 'transparent');
    change(element, 'text-shadow', 'none');
    for (const descendant of element.querySelectorAll('*')) change(descendant, 'visibility', 'hidden');
  }
  // 透明定位框只用于裁剪区域；把外部阴影也纳入图片，并裁到幻灯片边界。
  const rect = element.getBoundingClientRect(), bounds = canvas.getBoundingClientRect(), factor = bounds.width / canvas.offsetWidth * target.zoom;
  const left = Math.max(bounds.left, rect.left - target.padding.left * factor), top = Math.max(bounds.top, rect.top - target.padding.top * factor);
  const right = Math.min(bounds.right, rect.right + target.padding.right * factor), bottom = Math.min(bounds.bottom, rect.bottom + target.padding.bottom * factor);
  const capture = document.createElement('div');
  capture.setAttribute('data-aico-export-capture', '');
  capture.style.cssText = `all:initial!important;position:fixed!important;left:${left}px!important;top:${top}px!important;width:${right - left}px!important;height:${bottom - top}px!important;pointer-events:none!important;visibility:visible!important`;
  document.body.append(capture);
  window.__aicoEditableCapture.restore = () => {
    capture.remove();
    for (const el of showing) el.removeAttribute('data-aico-export-visible');
    style.remove();
    for (const [node, property, value, priority] of restores.reverse()) {
      if (value) node.style.setProperty(property, value, priority); else node.style.removeProperty(property);
    }
  };
}

export function restoreEditableCapture() {
  window.__aicoEditableCapture.restore?.();
}
