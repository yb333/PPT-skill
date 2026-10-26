#!/usr/bin/env node
/* probe.mjs — 能力探针：机械化判定当前环境/模型的档位（vision / novision）
   ---------------------------------------------------------------------
   原则：档位判定不靠模型自评（普遍高估），靠本探针 + 宿主声明。
   视觉能力无法从环境探测，由宿主声明：环境变量 AICO_VISION=1（有视觉）
   或 --vision 旗标；两者皆无 → 按 novision 处理。

   输出：逐项能力行 + 档位结论 + 该档位规则摘要（规则全文见 references/tiers.md）
*/
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const visionDeclared = args.includes('--vision') || process.env.AICO_VISION === '1';

const lines = [];
const cap = (name, ok, note = '') => lines.push({ name, ok, note });

cap('Node ≥18', parseInt(process.versions.node, 10) >= 18);

let browser = false;
try {
    const mod = await import(join(HERE, 'verify', 'load-playwright.mjs'));
    const chromium = await mod.loadChromium();
    browser = !!chromium;
} catch { browser = false; }
cap('浏览器自动化（playwright-core + Chrome/Edge）', browser, browser ? '' : '门禁四件套/导出不可运行');

let python = false;
try {
    execFileSync('python3', ['-c', 'import pptx'], { stdio: 'pipe' });
    python = true;
} catch { python = false; }
cap('python3 + python-pptx', python, python ? '' : '导出保真门禁不可运行');

cap('LibreOffice（渲染冒烟，可选）', ['soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice']
    .some(p => { try { execFileSync('which', [p], { stdio: 'pipe' }); return true; } catch { return existsSync(p); } }), '缺失时渲染对比降级跳过');

cap('视觉能力（宿主声明 AICO_VISION=1 / --vision）', visionDeclared,
    visionDeclared ? '' : '未声明 → 按 novision 档：禁目检、禁自由 SVG 自绘');

const vision = visionDeclared;
const toolchain = lines[1].ok && lines[2].ok && lines[0].ok;
const tier = vision ? 'vision' : 'novision';

console.log(lines.map(l => `${l.ok ? '✓' : '✗'} ${l.name}${l.note ? ' —— ' + l.note : ''}`).join('\n'));
console.log('—————————————————————————————');
if (!toolchain) {
    console.log('TIER=limited（工具链不全）');
    console.log('规则：仅 init-deck 骨架产出 + 填内容；门禁/导出不可跑——明确告知用户在本地运行门禁与导出。');
} else if (vision) {
    console.log('TIER=vision（完整形态）');
    console.log('规则：全流程可用——目检（shot）、自由 SVG 自绘、全部门禁与导出。');
} else {
    console.log('TIER=novision');
    console.log('规则：机器门禁照跑；禁止目检步骤（显式跳过并告知用户自行查看）；');
    console.log('复杂图示禁自由 SVG 自绘——降级为简单版式（流程条/对比两栏/表格/卡片网格），');
    console.log('或产出后标注「复杂图示待视觉模型/用户补充」。');
}
