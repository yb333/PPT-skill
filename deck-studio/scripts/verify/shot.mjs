#!/usr/bin/env node
// shot.mjs — 给 deck 的某一页截一张 1920×1080 JPEG（reveal 元素全显）
//
// 改编自 AICO-PPT@4b5fcdf scripts/verify/shot.mjs，适配 deck-studio 契约（同 measure_overflow.mjs 四要点）：
//   `section.slide` 画布 / `data-label` 页标识（回退序号·首标题）/ `.reveal` 强显 / 播放器杂物隐藏。
//   原 .stage 缩放还原 CSS（slide-fit/canvas transform）不适用——deck-studio 页为常规文档流无 transform。
//
// 用法:
//   node shot.mjs <deck.html> <label> <out.jpg>
//
// <label> 是 section.slide 的 data-label；找不到时列出全部可用 label。
// 退出码契约: 0 = 成功；1 = label 不存在；2 = 工具或参数错误。
// 依赖: Node >= 18、本机 Google Chrome、playwright-core（研发仓 npm install）。

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadChromium, launchChromium } from './load-playwright.mjs';

const [deckFile, label, outFile] = process.argv.slice(2);
if (!deckFile || !label || !outFile) { console.error('用法: node shot.mjs <deck.html> <label> <out.jpg>'); process.exit(2); }
if (!existsSync(deckFile)) { console.error(`找不到 deck 文件: ${deckFile}`); process.exit(2); }

let chromium;
try { chromium = await loadChromium(); }
catch (error) { console.error(error.message); process.exit(2); }
let browser, exitCode = 0;
try {
  browser = await launchChromium(chromium);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(deckFile).href, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => document.querySelectorAll('section.slide').length > 0, { timeout: 60000 });
  await page.waitForTimeout(5000); // 字体/图片 settle
  await page.addStyleTag({ content: `
    /* 舞台架构静态化：取消缩放、页全显纵向堆叠（兼容旧滚动 deck，为 no-op） */
    html,body{overflow:visible!important;height:auto!important;}
    .deck-stage{position:static!important;overflow:visible!important;height:auto!important;}
    .deck-fit{transform:none!important;width:1920px!important;height:auto!important;box-shadow:none!important;margin:0 auto!important;}
    section.slide{position:relative!important;inset:auto!important;visibility:visible!important;opacity:1!important;display:flex!important;}
    .deck-bar,.deck-menu,.deck-sidebar,.deck-progress,.nav-dots,.pres-cursor,.pres-cursor-hint,.player-hint,.keyboard-hint,.deck-editor-ui{display:none!important;}
    .reveal,.reveal-scale,.reveal-left,.reveal-blur{opacity:1!important;transform:none!important;filter:none!important;transition:none!important;}
    .slide .reveal:not(.shown){opacity:1!important;}
    *{animation-play-state:paused!important;}` });
  await page.evaluate(() => document.querySelectorAll('.slide').forEach(s => s.classList.add('visible')));
  await page.waitForTimeout(400); // 强显后的重绘 settle

  // 定位目标页（dataset 直比，无需 CSS.escape；同名页只取第一个）
  const idxs = await page.evaluate(lbl => {
    const out = [];
    document.querySelectorAll('section.slide').forEach((s, i) => { if (s.dataset.label === lbl) out.push(i); });
    return out;
  }, label);
  if (idxs.length === 0) {
    const all = await page.evaluate(() =>
      [...document.querySelectorAll('section.slide')].map((s, i) =>
        s.dataset.label ?? `(回退) ${i + 1}·${(s.querySelector('h1,h2,h3')?.innerText ?? '无标题').trim().slice(0, 14)}`));
    console.error(`找不到 data-label="${label}"。可用 label（${all.length} 个）:`);
    for (const l of all) console.error('  ' + l);
    exitCode = 1;
  } else {
    if (idxs.length > 1) console.warn(`警告: data-label="${label}" 有 ${idxs.length} 个同名页，只截第一个`);
    const el = (await page.$$('section.slide'))[idxs[0]];
    await el.scrollIntoViewIfNeeded();   // 原位截图（常规文档流，无 transform 祖先）
    await page.waitForTimeout(600);      // 滚动稳定
    await el.screenshot({ path: outFile, type: 'jpeg', quality: 90 });
    console.log(`shot "${label}" -> ${outFile}`);
  }
} catch (e) {
  console.error('执行失败（浏览器/页面基础设施错误）: ' + (e?.message ?? e));
  exitCode = 2;
} finally {
  if (browser) await browser.close().catch(() => {});
}
process.exit(exitCode);
