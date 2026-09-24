#!/usr/bin/env node
// sync-engine.mjs — 引擎唯一源同步器（deck-studio 引擎纪律的执行工具）
//
// 背景：每个 deck 是单文件 HTML，引擎以标记块内联其中。多副本手改必然漂移，
// 故引擎只允许在 assets/effects/ 五件套里改，deck 内一律标记块 + 本脚本同步。
//
// 用法:
//   node sync-engine.mjs [路径...] [--check]
//     路径 = deck 文件或目录（目录递归找 .html）；缺省扫描本 skill 的 assets/ 与同级 docs/（若存在）
//   --check  只校验不同步（块内容≠唯一源 / 块外存在引擎拷贝），退出码 1
//
// 标记协议（deck 内）:
//   /* ═══ DECK ENGINE:BEGIN ... ═══ */  player+stepfx+auto+ambient  /* ═══ DECK ENGINE:END ═══ */
//   /* ═══ DECK FX CSS:BEGIN ... ═══ */  effects.css                 /* ═══ DECK FX CSS:END ═══ */
// 无标记块的文件不做任何事（档案/素材文件不迁移不受检查）；
// 但含标记块的文件若在块外出现 class DeckPlayer（手改/残留拷贝）→ 校验失败。
//
// 退出码契约: 0 = 已同步/全部一致；1 = 校验失败；2 = 工具错误。

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));       // deck-studio/scripts
const ROOT = join(HERE, '..');                              // deck-studio/
const REPO = join(ROOT, '..');                              // 仓根
const CHECK = process.argv.includes('--check');
const EXPLICIT = process.argv.slice(2).filter(a => !a.startsWith('--'));

const JS_SOURCES = ['player.js', 'stepfx.js', 'auto.js', 'countup.js', 'ambient.js']
    .map(f => readFileSync(join(ROOT, 'assets/effects', f), 'utf8').trimEnd());
const FX_CSS = readFileSync(join(ROOT, 'assets/effects/effects.css'), 'utf8').trimEnd();

const ENGINE_BEGIN = '/* ═══ DECK ENGINE:BEGIN';
const ENGINE_END = '/* ═══ DECK ENGINE:END ═══ */';
const CSS_BEGIN = '/* ═══ DECK FX CSS:BEGIN';
const CSS_END = '/* ═══ DECK FX CSS:END ═══ */';

const engineBlock = () =>
    `${ENGINE_BEGIN} — 唯一源 deck-studio/assets/effects/ 四件套，勿手改；同步: node deck-studio/scripts/sync-engine.mjs ═══ */\n\n${JS_SOURCES.join('\n\n')}\n\n${ENGINE_END}`;
const cssBlock = () =>
    `${CSS_BEGIN} — 唯一源 deck-studio/assets/effects/effects.css，勿手改 ═══ */\n${FX_CSS}\n${CSS_END}`;

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (p.endsWith('.html')) out.push(p);
    }
    return out;
}

const docsDir = join(REPO, 'docs');
const files = EXPLICIT.length
    ? EXPLICIT.flatMap(p => {
        const full = resolve(p);
        if (!existsSync(full)) { console.error(`找不到: ${full}`); process.exit(2); }
        return statSync(full).isDirectory() ? walk(full) : [full];
      })
    : [...walk(join(ROOT, 'assets')), ...(existsSync(docsDir) ? walk(docsDir) : [])];
let dirty = 0, checked = 0;
const failures = [];

const slice = (text, beginMark, endMark) => {
    const b = text.indexOf(beginMark);
    if (b < 0) return null;
    const e = text.indexOf(endMark, b);
    if (e < 0) throw new Error(`有 BEGIN 无 END: ${beginMark}`);
    return [b, e + endMark.length];
};

for (const file of files) {
    const text = readFileSync(file, 'utf8');
    let out = text, changed = false;

    // —— 引擎块：不同步则替换；并检测块外引擎拷贝（漂移探测器）——
    const eng = slice(out, ENGINE_BEGIN, ENGINE_END);
    if (eng) {
        checked++;
        const want = engineBlock();
        const have = out.slice(eng[0], eng[1]);
        if (have.trim() !== want.trim()) {
            if (CHECK) failures.push(`${file}: 引擎块 ≠ 唯一源（需要 node deck-studio/scripts/sync-engine.mjs）`);
            else { out = out.slice(0, eng[0]) + want + out.slice(eng[1]); changed = true; }
        }
        const outside = out.slice(0, eng[0]) + out.slice(eng[1]);
        if (outside.includes('class DeckPlayer')) {
            failures.push(`${file}: 引擎块之外存在 class DeckPlayer 拷贝（漂移！删掉块内手改/块外残留）`);
        }
    }

    // —— FX CSS 块：有标记才管 ——
    const css = slice(out, CSS_BEGIN, CSS_END);
    if (css) {
        const want = cssBlock();
        const have = out.slice(css[0], css[1]);
        if (have.trim() !== want.trim()) {
            if (CHECK) failures.push(`${file}: FX CSS 块 ≠ 唯一源`);
            else { out = out.slice(0, css[0]) + want + out.slice(css[1]); changed = true; }
        }
    }

    if (changed) { writeFileSync(file, out); dirty++; console.log(`  synced ${file}`); }
}

if (CHECK) {
    if (failures.length) {
        console.error(`engine check 未通过（${failures.length} 项）:`);
        for (const f of failures) console.error('  - ' + f);
        process.exit(1);
    }
    console.log(`engine check 通过：${checked} 个 deck 引擎块与唯一源一致`);
    process.exit(0);
}
console.log(`sync-engine 完成：${dirty} 个文件更新，${checked} 个受管 deck`);
