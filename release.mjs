#!/usr/bin/env node
// release.mjs — 把技能本体发布到安装目录（~/.zcode/skills/deck-studio）——项目工具，住仓库根
//
// 开发在仓内进行；版本定稿后运行本脚本发布。目标若是软链则移除链接，
// 若是旧发布则整体替换——安装目录永远等于最近一次发布的定稿内容
// （D13：发布产物 = 纯技能本体，不含安装器）。复制复用 install.mjs 的
// publishSkill 原语（过滤 __pycache__/.DS_Store 缓存 + THIRD-PARTY-NOTICE
// 归属随包），与安装通道保持同一份逻辑，永不漂移。
// 用法: node release.mjs

import { rmSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { publishSkill } from './install.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), 'deck-studio');
const DEST = join(homedir(), '.zcode', 'skills', 'deck-studio');

if (!existsSync(join(SRC, 'SKILL.md'))) { console.error('release 必须在仓库根运行（依赖同级 deck-studio/ 与 install.mjs）'); process.exit(2); }

// 软链 → 删链接本身；旧发布目录 → 整体替换
try {
    const st = lstatSync(DEST);
    if (st.isSymbolicLink()) { rmSync(DEST); console.log('已移除软链'); }
    else if (st.isDirectory()) { rmSync(DEST, { recursive: true, force: true }); console.log('已清空旧发布'); }
} catch { /* 首次发布：目标不存在 */ }

publishSkill(DEST);
const count = (function walk(d) { return readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(join(d, e.name)) : 1), 0); })(DEST);
console.log(`已发布 ${count} 个文件 → ${DEST}（纯技能本体）`);
