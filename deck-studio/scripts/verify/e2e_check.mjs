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
page.on('pageerror', e => errors.push(e.message + '  @' + (e.stack || '').split('\n').slice(1, 2).join(' ').trim()));
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
  ok(s0.scrollModel.docH <= 1200, `根文档零滚动：docH=${s0.scrollModel.docH} ≤ 1200（滚动只允许在 stage 容器内）`);
  ok(await page.evaluate(() => document.getElementById('deckStage').scrollHeight > 1500),
     '浏览模式=无缝长页（stage 内容高度远超一屏）');

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

  // —— 放映模式：F 恒自封面起（产品决策：从头播放），申报程序（DECK_STEPS）优先，回退 reveal 节拍 ——
  console.log('== 放映模式：自封面起 · 申报程序 / 节拍步进 ==');
  await page.keyboard.press('f');
  await page.waitForTimeout(700);
  let st = await state();
  ok(st.presenting, 'F 进入放映态（body.presenting；全屏被拒时仍应成立）');
  ok(st.current === 0, `放映恒自封面起（current=${st.current}，与浏览位置无关）`);
  ok(!st.anyVisible, '进页 reveal 收起（第 0 拍空场）');
  const waitIdle = () => page.waitForFunction(() => !window.__deck || !window.__deck.busy, { timeout: 8000 }).catch(() => {});
  const curLabel = () => page.evaluate(() => document.querySelector('section.slide.current')?.dataset.label);
  const progClicks = (label) => page.evaluate(lbl => {
    const prog = (window.DECK_STEPS || {})[lbl];
    if (!prog) return null;
    return prog.reduce((n, a) => n + (a[0] === 'sumhide' ? 0 : a[0] === 't' ? 1 + a[1].filter(m => m[0] === 'gate').length : 1), 0);
  }, label);
  const pageBeats = async () => {
    const lbl = await curLabel();
    const pc = await progClicks(lbl);
    if (pc !== null) return { beats: pc, mode: 'prog' };
    return { beats: (await state()).revealCount, mode: 'reveal' };
  };

  // 逐页走查：每页先放完本页节拍（申报程序或 reveal），再一次翻页，直到末页
  for (let i = 0; i < s0.total - 1; i++) {
    const { beats, mode } = await pageBeats();
    for (let k = 0; k < beats; k++) {
      await page.keyboard.press('ArrowRight');
      await waitIdle();
      await page.waitForTimeout(120);
      const s = await state();
      ok(s.current === i, `第 ${i + 1} 页第 ${k + 1} 拍仍在本页（current=${s.current}）`);
      if (mode === 'reveal') {
        const shown = await page.evaluate(() =>
          [...document.querySelectorAll('section.slide.current .reveal.shown')].length);
        ok(shown === k + 1, `第 ${i + 1} 页第 ${k + 1} 拍放出 1 条（已放 ${shown}）`);
      } else if (k === 0) {
        ok(await page.evaluate(() => !!document.querySelector('section.slide.current .fx-layer')), '申报页巡游启动（fx 层出现）');
      }
    }
    await page.keyboard.press('ArrowRight');
    await waitIdle();
    await page.waitForTimeout(200);
    st = await state();
    ok(st.current === i + 1, `第 ${i + 1} 页节拍放完翻到第 ${i + 2} 页（current=${st.current}）`);
  }
  // —— 末页行为：节拍放完 → 两次确认结束放映（重复页 bug 回归） ——
  console.log('== 末页结束放映 ==');
  const lastBeats = await pageBeats();
  for (let k = 0; k < lastBeats; k++) {
    await page.keyboard.press('ArrowRight');
    await waitIdle();
    await page.waitForTimeout(120);
  }
  const stLast = await state();
  ok(stLast.presenting && stLast.current === s0.total - 1, '末页节拍放完仍在末页');
  ok(lastBeats === 0 || stLast.revealCount === 0 || stLast.anyVisible, '末页内容保持放出（未被重置）');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.body.classList.contains('presenting')), '第一次 →：武装提示，不误退、不重复');
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
    await page.waitForFunction(() => {
      const s = [...document.querySelectorAll('section.slide')];
      return s.findIndex(x => x.classList.contains('current')) === 0 &&
             document.getElementById('deckStage').scrollTop < 10;
    }, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    st = await state();
    ok(st.current === 0, `点缩略图跳页（current=${st.current}）`);
    ok(await page.evaluate(() => document.getElementById('deckSidebar').classList.contains('open')), '跳页后侧栏保持打开（连续预览）');
    await page.mouse.click(960, 540);
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => !document.getElementById('deckSidebar').classList.contains('open')), '点击侧栏外（页面内容）关闭');
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
