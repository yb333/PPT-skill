#!/usr/bin/env node
// install.mjs — deck-studio 一键安装（项目工具，住仓库根；技能本体 deck-studio/ 保持纯净）
// 模式参考 design-dev-agent install.py：编号步骤/双模式/--check/安装指纹/win 防闪退。
// ---------------------------------------------------------------------
// 布局契约（D13）：安装器（本文件 + install.sh/install.bat + release.mjs）与
// THIRD-PARTY-NOTICE / docs / tests 都住项目侧，不进技能目录；deck-studio/ 只含
// 技能执行所需（SKILL.md/references/assets/scripts/config.json + vendor node_modules）。
// 本文件在仓库根或离线包根运行，技能本体取同级 deck-studio/；
// --pack 打出的包 = 安装器 + deck-studio/ 并排，内网整目录拷走零改动可用。
//
// 用法：
//   node install.mjs                  # 全局安装 → ~/.config/opencode/skills/deck-studio
//   node install.mjs --local          # 项目级安装 → <当前目录>/.opencode/skills/deck-studio
//   node install.mjs --target <dir>   # 安装到指定 skills 根目录（如 ~/.zcode/skills）
//   node install.mjs --check          # 只检查环境，不安装
//   node install.mjs --pack [输出目录] # 打离线包（installer + deck-studio/ 并排，整目录拷去内网）
//   node install.mjs --help
//
// 环境契约：Node ≥18（硬依赖）；浏览器 Chrome 首选（playwright 原生 channel），
// 无 Chrome 自动回退 Edge/Chromium（win 内网常见形态零配置）；playwright-core 供
// 离线跑门禁，自动 vendor；Python+python-pptx 仅命令行 PPTX 转换/提取管线用，
// 可选（--check 一并探测，deck 内 ⤓ 按钮导出不依赖）。

import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { browserCandidates } from './deck-studio/scripts/verify/load-playwright.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));            // 项目根/离线包根（安装器所在处）
const SKILL = join(HERE, 'deck-studio');                         // 技能本体（纯净，不含安装器）
const NAME = 'deck-studio';
const argv = process.argv.slice(2);
const getOpt = flag => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };

/* 直接运行才执行安装流程；被 release.mjs import 复用发布原语时不启动 */
const isEntry = import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href;

if (isEntry && (argv.includes('--help') || argv.includes('-h'))) {
    console.log(`deck-studio 技能安装器
用法:
  node install.mjs                  全局安装 → ~/.config/opencode/skills/deck-studio
  node install.mjs --local          项目级安装 → <当前目录>/.opencode/skills/deck-studio
  node install.mjs --target <dir>   安装到指定 skills 根目录（如 ~/.zcode/skills）
  node install.mjs --check          只检查环境，不安装
  node install.mjs --pack [输出目录] 打离线包（installer + deck-studio/ 并排，整目录拷去内网）`);
    process.exit(0);
}

const engineVersion = () =>
    (readFileSync(join(SKILL, 'assets', 'effects', 'player.js'), 'utf8')
        .match(/DECK_ENGINE_VERSION = '([^']+)'/) || [])[1] || 'unknown';
const gitCommit = () => {
    const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: HERE, encoding: 'utf8', timeout: 10000 });
    return r.status === 0 ? r.stdout.trim() : 'unknown';
};
const firstExisting = list => list.find(p => p && existsSync(p));
const pythonCmd = () => {
    const candidates = process.platform === 'win32' ? [['py', '-3'], ['python'], ['python3']] : [['python3'], ['python']];
    for (const parts of candidates) {
        try { if (spawnSync(parts[0], parts.slice(1).concat(['--version']), { encoding: 'utf8' }).status === 0) return parts; }
        catch {}
    }
    return null;
};

/* —— playwright-core 源：技能目录内已 vendor（克隆/离线包形态）→ 项目根 node_modules（开发形态）—— */
const vendorSource = () =>
    firstExisting([join(SKILL, 'node_modules', 'playwright-core'), join(HERE, 'node_modules', 'playwright-core')]);

function envReport() {
    const nodeOk = Number(process.versions.node.split('.')[0]) >= 18;
    console.log(`  Node      ${nodeOk ? '✓' : '✗'} ${process.version}${nodeOk ? '' : '（需 ≥18，https://nodejs.org/）'}`);
    const found = browserCandidates().filter(existsSync);
    console.log(`  浏览器    ${found.length ? '✓ ' + found.join('  ') : '✗ 未发现 Chrome/Edge——门禁与放映验证不可用；可装 Chrome（首选）或用 AICO_BROWSER_EXECUTABLE 指定'}`);
    const vsrc = vendorSource();
    console.log(`  playwright-core ${vsrc ? '✓ ' + vsrc : '✗ 未找到——完整克隆本仓应自带（deck-studio/node_modules/）；若确缺，在有网机器 npm install playwright-core 或跑 --pack'}`);
    const py = pythonCmd();
    if (!py) console.log('  Python    ○ 未装（可选，仅命令行 PPTX 转换/提取用；deck 内 ⤓ 按钮导出不依赖）');
    else {
        const pptxOk = spawnSync(py[0], py.slice(1).concat(['-c', 'import pptx']), { encoding: 'utf8', timeout: 20000 }).status === 0;
        console.log(`  Python    ✓ ${py.join(' ')}${pptxOk ? '（python-pptx ✓）' : '（✗ 缺 python-pptx——CLI 高保真导出与 PPTX→HTML 提取需要，pip install python-pptx；deck 内 ⤓ 按钮导出不依赖）'}`);
    }
    return { nodeOk, browsers: found, vsrc };
}

/* vendor 剪裁：playwright-core 内嵌的 MCP 技能文档（lib/tools/skills/，含其 SKILL.md）
   会混淆宿主平台的技能扫描，一律不随技能体分发（仓内 vendor 副本已删，此为二道防线） */
const VENDOR_PRUNE = ['node_modules', 'playwright-core', 'lib', 'tools', 'skills'].join(sep);
const notPruned = src => !src.includes(VENDOR_PRUNE);

function copySkill(dest) {
    rmSync(dest, { recursive: true, force: true });
    cpSync(SKILL, dest, { recursive: true, filter: src => {
        const base = src.split(sep).pop();
        return notPruned(src) && base !== '.DS_Store' && base !== '__pycache__' && !src.endsWith('.saving.tmp');
    } });
}

/* 发布原语（release.mjs 复用）：同一份过滤 + MIT 归属随包，安装/发布两通道永不漂移。
   归属源头住项目根、不进技能本体；装出的技能目录因含 vendor 派生代码而随装携带一份。 */
export function publishSkill(dest) {
    copySkill(dest);
    const noticeSrc = join(HERE, 'THIRD-PARTY-NOTICE.md');
    if (existsSync(noticeSrc)) cpSync(noticeSrc, join(dest, 'THIRD-PARTY-NOTICE.md'));
}

function main() {
    console.log('='.repeat(55));
    console.log('  deck-studio 技能安装器（engine ' + engineVersion() + '）');
    console.log('='.repeat(55));
    console.log();

    // ── 1. 扫描本体 ──
    console.log('[1/5] 扫描技能本体...');
    const required = ['SKILL.md', 'references', 'assets', 'scripts', 'config.json'];
    const missing = required.filter(f => !existsSync(join(SKILL, f)));
    if (missing.length) { console.log(`  ✗ 本体不完整，缺: ${missing.join(', ')}（请在仓库根或离线包根运行——技能本体取同级 deck-studio/）`); return 1; }
    const counts = Object.fromEntries(readdirSync(SKILL).filter(f => statSync(join(SKILL, f)).isDirectory())
        .map(d => [d, readdirSync(join(SKILL, d)).length]));
    console.log(`  ✓ ${SKILL}  （SKILL.md + ${Object.entries(counts).map(([d, n]) => `${d}/${n} 项`).join(' + ')}）`);
    console.log();

    const checkOnly = argv.includes('--check');
    const packMode = argv.includes('--pack');

    // ── 2. 目标目录 ──
    let skillsRoot;
    if (argv.includes('--local')) skillsRoot = resolve(process.cwd(), '.opencode', 'skills');
    else if (getOpt('--target')) skillsRoot = resolve(getOpt('--target'));
    else skillsRoot = join(process.env.HOME || process.env.USERPROFILE, '.config', 'opencode', 'skills');
    const dest = packMode ? resolve(getOpt('--pack') && argv[argv.indexOf('--pack') + 1] || join(HERE, NAME + '-offline')) : join(skillsRoot, NAME);
    console.log(`[2/5] ${packMode ? '离线包输出' : '安装目标'}: ${dest}${packMode ? '' : `（${argv.includes('--local') ? '项目级' : '全局'}）`}`);
    console.log();

    // ── 3. 环境检测 ──
    console.log('[3/5] 环境检测...');
    const env = envReport();
    console.log();

    if (checkOnly) { console.log('检查模式，不执行安装。'); return env.nodeOk ? 0 : 1; }

    // ── 4. 复制本体（纯技能体；pack 形态 = 本体 + 安装器并排）──
    console.log(`[4/5] ${packMode ? '打包' : '复制'}技能本体...`);
    if (packMode) {
        copySkill(join(dest, 'deck-studio'));
        for (const f of ['install.mjs', 'install.sh', 'install.bat', 'THIRD-PARTY-NOTICE.md'])
            if (existsSync(join(HERE, f))) cpSync(join(HERE, f), join(dest, f));
        console.log(`  ✓ ${dest}  （deck-studio/ + 安装器并排，内网在包根 node install.mjs 即装）`);
    } else {
        publishSkill(dest);
        console.log(`  ✓ ${dest}  （纯技能本体，不含安装器）`);
    }
    console.log();

    // ── 5. vendor playwright-core（离线门禁）──
    console.log('[5/5] vendor playwright-core...');
    const payload = packMode ? join(dest, 'deck-studio') : dest;
    if (env.vsrc) {
        const vdest = join(payload, 'node_modules', 'playwright-core');
        if (!join(env.vsrc, sep).startsWith(join(SKILL, sep))) {    // 源已在技能目录内则 copySkill 已带，不重复拷
            rmSync(join(payload, 'node_modules'), { recursive: true, force: true });
            cpSync(env.vsrc, vdest, { recursive: true, filter: notPruned });
        }
        console.log(`  ✓ ${vdest}`);
    } else {
        console.log('  ○ 跳过（源上未找到 playwright-core）');
    }
    console.log();

    // ── 指纹（仅安装写；pack 不是安装产物）──
    if (!packMode) {
        const meta = { commit: gitCommit(), engine: engineVersion(), node: process.version,
                       browsers: env.browsers, installed_at: new Date().toISOString().slice(0, 19) };
        writeFileSync(join(dest, '_install_meta.json'), JSON.stringify(meta, null, 2));
        console.log(`  指纹: ${join(dest, '_install_meta.json')}（commit=${meta.commit}）`);
        console.log();
    }

    if (packMode) {
        console.log('离线包就绪：整个目录拷到内网任意位置，进入目录后运行');
        console.log('  node install.mjs            （或 win 双击 install.bat）');
        return 0;
    }
    console.log('='.repeat(55));
    console.log('  ✓ 安装完成！');
    console.log('='.repeat(55));
    console.log();
    console.log('  1. 重启 opencode（技能按 description 自动触发，说"做个 PPT"即可）');
    console.log('  2. 冒烟验证: node ' + join(dest, 'scripts', 'verify', 'measure_overflow.mjs') + ' <任意deck.html>');
    console.log('  3. 人手微调: node ' + join(dest, 'scripts', 'serve', 'deck-serve.mjs') + ' <deck.html>');
    console.log();
    return 0;
}

if (isEntry) {
    try { process.exit(main()); }
    catch (e) { console.error('\n✗ 安装出错：' + (e?.stack || e)); process.exit(1); }
}
