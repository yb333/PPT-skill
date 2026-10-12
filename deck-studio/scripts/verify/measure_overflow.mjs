#!/usr/bin/env node
// measure_overflow.mjs — 检测 deck 每页的内容溢出（slide 级 + 内层 overflow:hidden 裁切）
//
// 改编自 AICO-PPT@4b5fcdf scripts/verify/measure_overflow.mjs，适配 deck-studio 契约：
//   1. 画布选择器 `.stage .slide-canvas` → `section.slide`（自适应 100vw×100vh，
//      1920×1080 视口下恰为 1920×1080，deck 结构不变）
//   2. 页标识：`section.slide[data-label]`；缺失时回退「序号·首标题」
//   3. 强显 `.build` → 强显 `.reveal` 系（加 .visible + CSS !important 兜底）+ 暂停动画
//   4. 隐藏播放器杂物（.deck-progress/.nav-dots/.pres-cursor/.player-hint 等）
//
// 用法:
//   node measure_overflow.mjs <deck.html> [label ...]   # 只测指定 data-label 的页
//   node measure_overflow.mjs <deck.html> --all         # 测全部页（不传 label 同 --all）
//
// 输出: 每页 label、slide 溢出 Y/X（像素）、内层 overflow:hidden 裁切数量与 top 条目。
//
// 判定: slide 级溢出（Y/X > 0）或内层裁切 > NESTED_FAIL_PX 即失败。
// 字号/密度审计（layout.md「字号场景分档与边界值」）：单页可见文字（不含 SVG 图内标签）
// > 320 字硬顶（240 字 6×6 建议线仅提示）；HTML 文本字号 < 14px 硬限；SVG 图内文字
// 有效字号（viewBox 缩放折算到画布）< 9px 硬限。
// 内层裁切必须判失败——deck-studio 的 .slide-content 自带 overflow:hidden（双保险），
// 内容超高时 slide 级溢出恒为 0，真实丢内容全部发生在内层裁切上（冒烟验证证实）。
//
// 退出码契约: 0 = 通过；1 = 检测到问题（溢出 / 内层裁切超阈 / label 不存在）；2 = 工具或参数错误。
// 依赖: Node >= 18、本机 Google Chrome、playwright-core（研发仓 npm install）。

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadChromium, chromiumLaunchOptions } from './load-playwright.mjs';

const TRUNC = 36;        // 元素文本摘要统一截断长度
const NESTED_FAIL_PX = 6; // 内层 overflow:hidden 裁切超过此值判失败（2px 为舍入容差，刻意省略号截断等微小裁切不误报）

const [deckFile, ...rest] = process.argv.slice(2);
if (!deckFile) { console.error('用法: node measure_overflow.mjs <deck.html> [label ...|--all]'); process.exit(2); }
if (!existsSync(deckFile)) { console.error(`找不到 deck 文件: ${deckFile}`); process.exit(2); }
const wantLabels = rest.filter(a => a !== '--all');

let chromium;
try { chromium = await loadChromium(); }
catch (error) { console.error(error.message); process.exit(2); }
let browser, exitCode = 0;
try {
  browser = await chromium.launch(chromiumLaunchOptions());
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(deckFile).href, { waitUntil: 'load', timeout: 180000 }); // 单文件 deck 很大，放宽超时
  await page.waitForFunction(() => document.querySelectorAll('section.slide').length > 0, { timeout: 60000 });
  await page.waitForTimeout(5000); // 字体/图片 settle
  await page.addStyleTag({ content: `
    /* 舞台架构静态化：取消缩放、页全显纵向堆叠（兼容旧滚动 deck，为 no-op） */
    html,body{overflow:visible!important;height:auto!important;}
    .deck-stage{position:static!important;overflow:visible!important;height:auto!important;}
    .deck-fit{transform:none!important;width:1920px!important;height:auto!important;box-shadow:none!important;margin:0 auto!important;}
    section.slide{position:relative!important;inset:auto!important;visibility:visible!important;opacity:1!important;display:flex!important;}
    /* 播放器杂物隐藏 */
    .deck-bar,.deck-menu,.deck-sidebar,.deck-progress,.nav-dots,.pres-cursor,.pres-cursor-hint,.player-hint,.keyboard-hint{display:none!important;}
    /* reveal 强显：测量必须反映最终态，防止隐藏态漏测 */
    .reveal,.reveal-scale,.reveal-left,.reveal-blur{opacity:1!important;transform:none!important;filter:none!important;transition:none!important;}
    .slide .reveal:not(.shown){opacity:1!important;}
    *{animation-play-state:paused!important;}` });
  await page.evaluate(() => document.querySelectorAll('.slide').forEach(s => s.classList.add('visible')));
  await page.waitForTimeout(400); // 强显后的重排 settle

  // 全部页面的 { idx, label }（label 为 null 表示该页无 data-label，用序号+首标题回退）
  const pages = await page.evaluate(() =>
    [...document.querySelectorAll('section.slide')].map((s, i) => ({
      idx: i,
      label: s.dataset.label ?? null,
      fallback: `${i + 1}·${(s.querySelector('h1,h2,h3')?.innerText ?? '无标题').replace(/\s+/g, ' ').trim().slice(0, 14)}`,
    })));

  // 待测清单：--all 全测；显式 label 只取第一个匹配并警告
  const targets = [];
  if (wantLabels.length === 0) {
    const seen = new Map();
    for (const p of pages) {
      const name = p.label ?? p.fallback; // 无 data-label 的页也测，用回退名标注
      const n = (seen.get(name) ?? 0) + 1; seen.set(name, n);
      targets.push({ idx: p.idx, disp: n > 1 ? `${name} #${n}` : name });
    }
  } else {
    for (const lbl of wantLabels) {
      const hits = pages.filter(p => p.label === lbl);
      if (hits.length === 0) {
        console.error(`找不到 data-label="${lbl}"。可用 label:`);
        for (const p of pages) console.error('  ' + (p.label ?? `(回退) ${p.fallback}`));
        exitCode = 1; continue;
      }
      if (hits.length > 1) console.warn(`警告: data-label="${lbl}" 有 ${hits.length} 个同名页，只测第一个（全测请用 --all）`);
      targets.push({ idx: hits[0].idx, disp: lbl });
    }
  }

  for (const t of targets) {
    const el = (await page.$$('section.slide'))[t.idx];
    await el.scrollIntoViewIfNeeded();      // 原位测量（.slide 在常规文档流，无 transform 祖先）
    await page.waitForTimeout(250);         // 滚动稳定
    const r = await el.evaluate((node, trunc) => {
      const clips = [];
      for (const e of node.querySelectorAll('*')) {
        const cs = getComputedStyle(e);
        const txt = (e.innerText || '').replace(/\s+/g, ' ').slice(0, trunc);
        if ((cs.overflow === 'hidden' || cs.overflowY === 'hidden') && e.scrollHeight - e.clientHeight > 2)
          clips.push({ dir: 'Y', amt: Math.round(e.scrollHeight - e.clientHeight), txt });
        if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && e.scrollWidth - e.clientWidth > 2)
          clips.push({ dir: 'X', amt: Math.round(e.scrollWidth - e.clientWidth), txt });
      }
      clips.sort((a, b) => b.amt - a.amt);
      // —— 字号/密度审计数据 ——
      let htmlChars = 0, htmlMin = Infinity, svgMin = Infinity;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent.trim();
        if (!t) continue;
        const parent = walker.currentNode.parentElement;
        if (parent.closest('svg')) continue;                       // SVG 图内文字单列
        htmlChars += t.replace(/\s+/g, '').length;
        const fs = parseFloat(getComputedStyle(parent).fontSize);
        if (fs > 0) htmlMin = Math.min(htmlMin, fs);
      }
      node.querySelectorAll('svg text').forEach(t => {
        const svg = t.ownerSVGElement;
        const attr = parseFloat(t.getAttribute('font-size') || getComputedStyle(t).fontSize);
        const scale = svg && svg.viewBox.baseVal.width ? svg.getBoundingClientRect().width / svg.viewBox.baseVal.width : 1;
        const eff = attr * scale;                                  // viewBox 单位折算到画布实际尺寸
        if (eff > 0) svgMin = Math.min(svgMin, eff);
      });
      return { y: Math.round(node.scrollHeight - node.clientHeight),
               x: Math.round(node.scrollWidth - node.clientWidth),
               nClips: clips.length, top: clips.slice(0, 6),
               worst: clips.length ? clips[0].amt : 0,
               typo: { htmlChars, htmlMin: isFinite(htmlMin) ? Math.round(htmlMin) : null,
                       svgMin: isFinite(svgMin) ? Math.round(svgMin * 10) / 10 : null } };
    }, TRUNC);
    console.log(`--- ${t.disp} ---  slide overflow Y=${r.y} X=${r.x}  nested clips=${r.nClips}`);
    for (const c of r.top) console.log(`    clip ${c.dir} +${c.amt}px  ${JSON.stringify(c.txt)}`);
    if (r.y > 0 || r.x > 0) {
      console.log(`    ✗ slide 级溢出，内容超出画布`);
      exitCode = 1;
    }
    if (r.worst > NESTED_FAIL_PX) {
      console.log(`    ✗ 内层裁切 ${r.worst}px > ${NESTED_FAIL_PX}px，存在被 overflow:hidden 裁掉看不见的内容`);
      exitCode = 1;
    }
    // —— 字号/密度审计（✗ 硬限阻断 / ⚠ 建议不阻断；阈值依据见 layout.md 边界值节）——
    const ty = r.typo;
    console.log(`    文字量=${ty.htmlChars} 字（建议≤240/硬顶320）  字号 html≥${ty.htmlMin ?? '—'}px（硬限14）  svg有效≥${ty.svgMin ?? '—'}px（硬限9）`);
    if (ty.htmlChars > 320) { console.log('    ✗ 单页文字量超 320 字硬顶——超出即不是合理的表达，应拆页'); exitCode = 1; }
    else if (ty.htmlChars > 240) console.log('    ⚠ 文字量超 240 字（6×6 边界）：建议拆页或精简');
    if (ty.htmlMin != null && ty.htmlMin < 14) { console.log(`    ✗ HTML 文本最小字号 ${ty.htmlMin}px < 14px 硬下限`); exitCode = 1; }
    if (ty.svgMin != null && ty.svgMin < 9) { console.log(`    ✗ SVG 图内文字有效字号 ${ty.svgMin}px < 9px 硬下限`); exitCode = 1; }
  }
} catch (e) {
  console.error('执行失败（浏览器/页面基础设施错误）: ' + (e?.message ?? e));
  exitCode = 2;
} finally {
  if (browser) await browser.close().catch(() => {});
}
process.exit(exitCode);
