#!/usr/bin/env node
/* export_check.mjs — 导出保真门禁（第五件套）
   ---------------------------------------------------------------------
   对 deck 实际触发一次 ⤓ 可编辑导出，对产物 PPTX 做保真断言。
   每条断言对应一类历史真实 bug：

     ① 页数平价            → 导出缺页
     ② 文本存在性          → 卡片文字在导出中丢失
     ③ 文本去重            → 复杂元素光栅化带字 + 可编辑文字双份
     ④ 图片数量            → 复杂背景被整块光栅化成多余图片（含字）
     ⑤ 媒体体积            → 照片重拍成超大 PNG / CSS 渐变整页大图
     ⑥ 大面积遮挡启发式    → 半透明背景实心化+升顶，盖住整页内容

   用法:
     node export_check.mjs <deck.html> [--fast] [--keep]
       --fast  跳过 ⑥（保留 ①–⑤，秒级）
       --keep  保留中间产物（/tmp/deck-export-check/）
   退出码: 0 = 全过；1 = 有断言失败；2 = 环境不可用（导出跳过）

   依赖: playwright-core + 本机 Chrome（同 load-playwright.mjs）；python3 + python-pptx。
*/
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORK = '/tmp/deck-export-check';

const args = process.argv.slice(2);
const deck = args.find(a => !a.startsWith('--'));
const FAST = args.includes('--fast');
const KEEP = args.includes('--keep');
if (!deck || !existsSync(deck)) {
    console.error('用法: node export_check.mjs <deck.html> [--fast] [--keep]');
    process.exit(2);
}
const deckAbs = resolve(deck);

// —— ① 环境探测（python-pptx 缺失时整门禁跳过，不算失败）——
let pyOk = true;
try {
    execFileSync('python3', ['-c', 'import pptx'], { stdio: 'pipe' });
} catch {
    console.error('export_check 跳过：python3/python-pptx 不可用（pip install python-pptx 后重试）');
    process.exit(2);
}

const { loadChromium, chromiumLaunchOptions } = await import(join(HERE, 'load-playwright.mjs'));
const chromium = await loadChromium();
const browser = await chromium.launch(chromiumLaunchOptions());

const rm = p => { try { rmSync(p, { recursive: true, force: true }); } catch {} };
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

// —— 打开 deck，采集每页期望值（可见文本语料 / img 数 / section 数），再触发导出 ——
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + deckAbs.replace(/^\/+/, '/'));
await page.waitForTimeout(800);

const expected = await page.evaluate(() => {
    const slides = [...document.querySelectorAll('section.slide')];
    return {
        count: slides.length,
        slides: slides.map(section => {
            const texts = new Map();
            let imgs = 0;
            const walk = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
            for (let n = walk.nextNode(); n; n = walk.nextNode()) {
                const p = n.parentElement;
                if (!p || p.closest('script,style,[data-deck-editor],.deck-editor-ui,.fx-layer,.ambient-layer')) continue;
                const cs = getComputedStyle(p);
                if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
                const r = p.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) continue;
                const t = n.textContent.replace(/\s+/g, ' ').trim();
                if (t.length < 2) continue;
                texts.set(t, (texts.get(t) || 0) + 1);
            }
            imgs = section.querySelectorAll('img').length;
            return { texts: Object.fromEntries(texts), imgs };
        }),
    };
});

const hasBtn = await page.evaluate(() => !!document.getElementById('pptxBtn'));
if (!hasBtn) {
    console.error('export_check 跳过：deck 无 #pptxBtn 导出按钮（chrome 需含 ⤓ PPT）');
    process.exit(2);
}
const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }),
    page.click('#pptxBtn'),
]);
const pptxPath = join(WORK, 'export.pptx');
await download.saveAs(pptxPath);
await browser.close();

// —— 期望值落盘，交给 python 断言（python-pptx 读形状/媒体/z 序）——
const expectPath = join(WORK, 'expect.json');
writeFileSync(expectPath, JSON.stringify({ ...expected, file: deckAbs }, null, 1));

const assertPy = join(HERE, 'export_assert.py');
let out;
try {
    out = execFileSync('python3', [assertPy, pptxPath, expectPath, FAST ? '--fast' : '--full'],
                       { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    console.error(out);
    console.error('export_check 失败：断言脚本异常');
    process.exit(2);
}

// —— 输出与退出码 ——
let fails = 0, warns = 0;
for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    try {
        const { ok, warn, name, detail } = JSON.parse(line);
        if (warn) { warns++; console.log(`  ⚠ ${name}${detail ? ' —— ' + detail : ''}`); continue; }
        if (!ok) fails++;
        console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' —— ' + detail : ''}`);
    } catch { console.log('  ' + line); }
}
if (!KEEP) { rmSync(pptxPath, { force: true }); rmSync(expectPath, { force: true }); }
else console.log(`产物保留：${WORK}`);
console.log(fails ? `export_check 未通过（${fails} 项）` : 'export_check 全部通过' + (warns ? `（${warns} 条提醒）` : ''));
process.exit(fails ? 1 : 0);
