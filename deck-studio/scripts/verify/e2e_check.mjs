#!/usr/bin/env node
// e2e_check.mjs — deck 真实交互路径测试（不注入强制 CSS，模拟用户键鼠）
//
// 背景：shot/measure 工具会强制 reveal 可见，测不出"真实浏览时页面全白"这类 bug
// （2026-09-22 白页事故的教训）。本脚本走用户路径：打开 → 逐页翻页 → 断言内容可见 →
// 进入放映 → 断言节拍步进。
//
// 用法: node e2e_check.mjs <deck.html>
// 退出码契约: 0 = 全过；1 = 断言失败；2 = 工具或基础设施错误。

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadChromium, chromiumLaunchOptions } from './load-playwright.mjs';

const [deckFile] = process.argv.slice(2);
if (!deckFile) { console.error('用法: node e2e_check.mjs <deck.html>'); process.exit(2); }
if (!existsSync(deckFile)) { console.error(`找不到 deck 文件: ${deckFile}`); process.exit(2); }

const fails = [];
const ok = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { console.log(`  ✗ ${msg}`); fails.push(msg); } };

let chromium;
try { chromium = await loadChromium(); }
catch (error) { console.error(error.message); process.exit(2); }

const browser = await chromium.launch(chromiumLaunchOptions());
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(pathToFileURL(deckFile).href, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('section.slide').length > 0, { timeout: 60000 });
  await page.waitForTimeout(2000);

  const state = () => page.evaluate(() => {
    const slides = [...document.querySelectorAll('section.slide')];
    const cur = slides.findIndex(s => s.classList.contains('current'));
    const curEl = slides.find(s => s.classList.contains('current'));
    const reveals = curEl ? [...curEl.querySelectorAll('.reveal')].map(el => getComputedStyle(el).opacity) : [];
    return {
      total: slides.length, current: cur, presenting: document.body.classList.contains('presenting'),
      revealCount: reveals.length,
      allVisible: reveals.length > 0 && reveals.every(op => parseFloat(op) > 0.9),
      anyVisible: reveals.some(op => parseFloat(op) > 0.9),
      scrollModel: { docH: document.documentElement.scrollHeight, scrollY: Math.round(scrollY) },
    };
  });

  const s0 = await state();
  ok(s0.total >= 2, `页数 ${s0.total} ≥ 2`);
  ok(s0.current === 0, `打开后第 1 页为当前页（实际 current=${s0.current}）`);
  ok(s0.scrollModel.docH <= 1200, `零滚动模型：docH=${s0.scrollModel.docH} ≤ 1200（滚动架构残留会 >2000）`);

  // —— 浏览模式：逐页翻页，reveal 必须全可见（阅读模式），无白页 ——
  console.log('== 浏览模式逐页翻页 ==');
  for (let i = 1; i < s0.total; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(650);
    const st = await state();
    ok(st.current === i, `→ 第 ${i + 1} 页为当前页（实际 ${st.current}）`);
    ok(st.revealCount === 0 || st.allVisible, `第 ${i + 1} 页 reveal 全可见（白页检查，${st.revealCount} 个元素）`);
  }
  // 回翻
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  const sb = await state();
  ok(sb.current === s0.total - 2, `← 回翻到第 ${s0.total - 1} 页（实际 ${sb.current}）`);

  // —— 放映模式：reveal 收起 + 节拍步进 ——
  console.log('== 放映模式节拍步进 ==');
  await page.keyboard.press('f');
  await page.waitForTimeout(700);
  let st = await state();
  ok(st.presenting, 'F 进入放映态（body.presenting；全屏被拒时仍应成立）');
  ok(!st.anyVisible, '进页 reveal 收起（第 0 拍空场）');
  const stepsToWalk = st.revealCount + 1; // 放完本页 reveal + 翻页
  for (let k = 1; k <= stepsToWalk; k++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(450);
    st = await state();
    if (k <= stepsToWalk - 1) {
      ok(st.current === s0.total - 2, `第 ${k} 拍仍在当前页`);
      const shown = await page.evaluate(() =>
        [...document.querySelectorAll('section.slide.current .reveal.shown')].length);
      ok(shown === k, `第 ${k} 拍放出 1 条（已放 ${shown}）`);
    } else {
      ok(st.current === s0.total - 1, `节拍放完翻到下一页（current=${st.current}）`);
    }
  }
  // —— 末页行为：节拍放完 → 两次确认结束放映（重复页 bug 回归） ——
  console.log('== 末页结束放映 ==');
  for (let k = 0; k < st.revealCount; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(450); }
  const stLast = await state();
  ok(stLast.presenting && stLast.current === s0.total - 1, '末页节拍放完仍在末页');
  ok(stLast.revealCount === 0 || stLast.anyVisible, '末页 reveal 保持放出（未被重置）');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.body.classList.contains('presenting')), '第一次 →：武装提示，不误退、不重复');
  const shownKeep = await page.evaluate(() => [...document.querySelectorAll('section.slide.current .reveal.shown')].length);
  ok(shownKeep === stLast.revealCount, `末页内容未被重置（shown=${shownKeep}/${stLast.revealCount}）`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  ok(!(await page.evaluate(() => document.body.classList.contains('presenting'))), '第二次 →：结束放映');
  st = await state();
  ok(st.current === s0.total - 1, `结束后停在最后一页（current=${st.current}）`);

  // —— 缩略图侧边窗（存在才测）——
  const hasToc = await page.evaluate(() => !!document.getElementById('deckMenu'));
  if (hasToc) {
    console.log('== 缩略图侧边窗 ==');
    await page.click('#deckMenu');
    await page.waitForTimeout(500);
    const toc = await page.evaluate(() => {
      const sb = document.getElementById('deckSidebar');
      return { open: sb.classList.contains('open'),
               items: sb.querySelectorAll('.thumb-item').length,
               clones: sb.querySelectorAll('.thumb-page').length };
    });
    ok(toc.open, '点胶囊打开侧栏');
    ok(toc.items === s0.total && toc.clones === s0.total, `缩略图数 = 页数（${toc.items}/${toc.clones} vs ${s0.total}）`);
    await page.evaluate(() => document.querySelectorAll('#deckThumbs .thumb-item')[0].click());
    await page.waitForTimeout(500);
    st = await state();
    ok(st.current === 0, `点缩略图跳页（current=${st.current}）`);
    ok(await page.evaluate(() => !document.getElementById('deckSidebar').classList.contains('open')), '跳页后侧栏自动关闭');
    await page.click('#deckMenu');
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => !document.getElementById('deckSidebar').classList.contains('open')), 'Esc 关闭侧栏');
  }

  if (errors.length) {
    ok(false, `页面 JS 错误 ${errors.length} 条：${errors.slice(0, 3).join(' | ')}`);
  } else {
    ok(true, '无页面 JS 错误');
  }
} catch (e) {
  console.error('执行失败（浏览器/页面基础设施错误）: ' + (e?.message ?? e));
  await browser.close().catch(() => {});
  process.exit(2);
}
await browser.close().catch(() => {});

if (fails.length) {
  console.error(`\ne2e 未通过（${fails.length} 项）:`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\ne2e 全部通过');
process.exit(0);
