#!/usr/bin/env node
/* init-deck.mjs — deck 脚手架：一条命令产出可直接填内容的完整骨架
   ---------------------------------------------------------------------
   固定件（头部 CSS/chrome/封面/结束页/引擎块/作者数据区）全部脚本预制，
   模型（或人）只填内容 section——杜绝手工拼装类事故：
   漏 chrome、引擎块吞数据区、按钮样式丢失、document.title 残留。

   用法：
     node init-deck.mjs <输出.html> --title "标题" [--date YYYY.MM]
                        [--template yunshan|none] [--sections N] [--subtitle "副题"]

   产出后：填内容 section → node sync-engine.mjs <deck> --check → 门禁四件套。
   （封面日期/作者行会被 sync-engine 按 config 统一署名。）
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCAFFOLD = join(HERE, '..', 'assets', 'templates', 'scaffold');

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--'));
const opt = (name, def) => {
    const i = args.indexOf('--' + name);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const title = opt('title');
const template = opt('template', 'yunshan');
const sections = Math.max(1, parseInt(opt('sections', '2'), 10) || 2);
const date = opt('date', new Date().getFullYear() + '.' + String(new Date().getMonth() + 1).padStart(2, '0'));
const subtitle = opt('subtitle', title);

if (!out || !title) {
    console.error('用法: node init-deck.mjs <输出.html> --title "标题" [--date YYYY.MM] [--template yunshan|none] [--sections N] [--subtitle "副题"]');
    process.exit(1);
}
if (!['yunshan', 'none'].includes(template)) {
    console.error(`未知模板: ${template}（可选 yunshan | none）`);
    process.exit(1);
}

const frag = f => readFileSync(join(SCAFFOLD, f), 'utf8');
const head = frag('shared/head.html').replace('{{TITLE}}', title);
const coverSrc = frag(`${template}/cover.html`);
const endingSrc = frag(`${template}/ending.html`);
const skeleton = frag('shared/section-skeleton.html');
const after = frag('shared/after-sections.html');
const scriptTail = frag('shared/script-tail.html');

// 目录规则（page-types.md）：deck 总页数 ≥7 放目录 → sections ≥4 时自动插入目录页骨架
const withToc = sections >= 4;
const total = sections + (withToc ? 3 : 2);
const cover = coverSrc
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DATE}}/g, date)
    .replace(/{{SUBTITLE}}/g, subtitle);
const ending = endingSrc.replace(/{{SUBTITLE}}/g, subtitle);
const toc = withToc ? frag('shared/toc.html').replace(/{{TOTAL}}/g, String(total)) : '';
const body = Array.from({ length: sections }, (_, i) =>
    skeleton
        .replace(/{{N}}/g, String(i + 1))
        .replace(/{{PAGE}}/g, String(i + (withToc ? 3 : 2)))
        .replace(/{{TOTAL}}/g, String(total))
).join('\n');

const deck = head + '\n' + cover + (withToc ? toc + '\n' : '') + body + ending + '\n' + after + '\n' + scriptTail;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, deck);

// 引擎块填充 + 校验
const sync = join(HERE, 'sync-engine.mjs');
execSync(`node "${sync}" "${out}"`, { stdio: 'inherit' });

console.log(`\ninit-deck 完成：${out}（${template} 模板，${sections} 个内容页骨架，共 ${total} 页${withToc ? '，含目录页' : ''}）`);
console.log('下一步：');
console.log('  1. 填充内容 section（页型选 references/page-types.md，图走 references/svg-diagrams.md，文走 references/copywriting.md）');
console.log(`  2. node "${sync}" "${out}" --check`);
console.log('  3. 门禁四件套（SKILL.md Phase 5）');
