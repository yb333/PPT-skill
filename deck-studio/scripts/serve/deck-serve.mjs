#!/usr/bin/env node
// deck-serve.mjs — deck 本地服务：浏览器内所见即所得微调 + 保存写回 + 门禁联动
// ---------------------------------------------------------------------
// 用法: node deck-serve.mjs <deck.html> [--port 4173]
//   打开打印出的地址（?edit=1 直达编辑态，或页内按 E）：
//     点文字直接改 · 单击选中/拖拽挪位/方向键微调 · 浮动工具条改色号字
//     Ctrl+S 保存 → 静态门禁（sync --check）通过才写回原文件（旧版留 <file>.bak）
//              → 自动刷新；溢出门禁后台跑完经 SSE 推送 toast
//
// 边界（宪法）：编辑器由本服务注入，deck 文件保持干净（直接双击打开=纯观看）；
// 结构变化（增删页/画新图/动画序列设计）不走编辑态，仍走对话；
// SVG 内部与引擎标记块在编辑态不可改（改字例外走代码/对话）。
//
// 依赖：Node ≥18，零三方包；溢出门禁需 playwright-core + 本机 Chrome
// （见 ../verify/load-playwright.mjs，PLAYWRIGHT_CORE / AICO_BROWSER_EXECUTABLE 可指路）。

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));            // scripts/serve
const SCRIPTS = dirname(HERE);                                   // scripts
const SYNC_MJS = join(SCRIPTS, 'sync-engine.mjs');
const MEASURE_MJS = join(SCRIPTS, 'verify', 'measure_overflow.mjs');
const EDITOR_JS = join(HERE, 'editor.js');
const EDITOR_CSS = join(HERE, 'editor.css');

const argv = process.argv.slice(2);
const deckArg = argv.find(a => !a.startsWith('--'));
const portIdx = argv.indexOf('--port');
const PORT = portIdx >= 0 ? Number(argv[portIdx + 1]) || 4173 : 4173;
if (!deckArg || !existsSync(deckArg)) {
    console.error('用法: node deck-serve.mjs <deck.html> [--port 4173]');
    process.exit(2);
}
const DECK = resolve(deckArg);
const BAK = DECK + '.bak';
const TMP = DECK + '.saving.tmp';
const MAX_BODY = 64 * 1024 * 1024;

const readDeck = () => readFileSync(DECK, 'utf8');
const inject = html => {
    const tag = '<link rel="stylesheet" href="/__deck/editor.css" data-deck-editor="1">\n' +
                '<script data-deck-editor="1" src="/__deck/editor.js"></script>\n';
    const at = html.lastIndexOf('</body>');
    return at >= 0 ? html.slice(0, at) + tag + html.slice(at) : html + tag;
};

// —— SSE：保存后的门禁结果与刷新指令推给所有打开的页面 ——
const clients = new Set();
const broadcast = (event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(payload);
};
const tail = (text, n = 3) => text.split('\n').map(l => l.trim()).filter(Boolean).slice(-n).join('；');

const runGateSync = () => {                                       // 静态门禁：引擎块完整性（快，保存前置条件）
    const r = spawnSync(process.execPath, [SYNC_MJS, '--check', TMP], { encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    return r.status === 0 ? { ok: true } : { ok: false, detail: tail(out) };
};
const runGateOverflow = file => {                                 // 溢出/密度门禁（慢，保存后异步推送）
    const child = spawn(process.execPath, [MEASURE_MJS, file], { encoding: 'utf8' });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('close', code => {
        clearTimeout(timer);
        broadcast('gate', code === 0
            ? { tool: 'overflow', ok: true, summary: '溢出 0 · 字号/密度门禁通过' }
            : { tool: 'overflow', ok: false, summary: tail(out) });
    });
};

const save = body => {
    let doc;
    try { doc = JSON.parse(body).html; } catch { return { code: 400, body: { ok: false, error: '请求不是合法 JSON' } }; }
    if (typeof doc !== 'string' || doc.length < 100 || doc.length > MAX_BODY)
        return { code: 400, body: { ok: false, error: 'html 字段缺失或尺寸异常' } };
    const had = marker => readDeck().includes(marker);
    if (had('DECK ENGINE:BEGIN') !== doc.includes('DECK ENGINE:BEGIN') ||
        had('DECK ENGINE:END') !== doc.includes('DECK ENGINE:END'))
        return { code: 422, body: { ok: false, error: '引擎标记块丢失或新增——引擎块不可改，请撤销后重试' } };
    if (!/<\/html>\s*$/i.test(doc))
        return { code: 422, body: { ok: false, error: '文档不完整（缺少 </html>）' } };
    if (/class="[^"]*\bthumb-page/.test(doc))                     // CSS 选择器 .thumb-page 合法；克隆残留必现形于 class 属性
        return { code: 422, body: { ok: false, error: '检测到缩略图克隆残留——请刷新页面后重做这次修改' } };
    writeFileSync(TMP, doc);
    const sync = runGateSync();
    if (!sync.ok) {                                               // 引擎块被改/漂移：拒收，不动原文件
        try { renameSync(TMP, TMP + '.rejected'); } catch {}
        return { code: 422, body: { ok: false, error: `引擎块校验未过（已存 .rejected 供比对）：${sync.detail}` } };
    }
    copyFileSync(DECK, BAK);                                      // 单代备份：上一版永远在 <file>.bak
    renameSync(TMP, DECK);
    return { code: 200, body: { ok: true, note: '已写回，溢出门禁运行中' } };
};

createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__deck/events') {                               // SSE 长连接
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        res.write('retry: 2000\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }
    if (url === '/__deck/save' && req.method === 'POST') {
        const chunks = []; let total = 0, over = false;
        req.on('data', c => { chunks.push(c); total += c.length; if (total > MAX_BODY) { over = true; req.destroy(); } });
        req.on('end', () => {
            if (over) return;
            const result = save(Buffer.concat(chunks).toString('utf8'));   // Buffer 累积一次解码：chunk 边界不得撕裂多字节字符
            if (result.body.ok) {                                 // 写回成功：通知所有页面刷新，再跑溢出门禁
                broadcast('reload', { ok: true });
                runGateOverflow(DECK);
            }
            res.writeHead(result.code, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result.body));
        });
        return;
    }
    const asset = { '/__deck/editor.js': [EDITOR_JS, 'text/javascript; charset=utf-8'],
                    '/__deck/editor.css': [EDITOR_CSS, 'text/css; charset=utf-8'] }[url];
    if (asset) {
        res.writeHead(200, { 'content-type': asset[1] });
        res.end(readFileSync(asset[0]));
        return;
    }
    if (url === '/' || url === '/' + baseName(DECK)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(inject(readDeck()));
        return;
    }
    res.writeHead(url === '/favicon.ico' ? 204 : 404);
    res.end();
}).listen(PORT, () => {
    console.log(`deck-serve: http://localhost:${PORT}/?edit=1`);
    console.log(`  deck: ${DECK}（保存写回原文件，上一版留 ${BAK}）  Ctrl+C 停止`);
});
function baseName(p) { return p.split(/[\\/]/).pop(); }
