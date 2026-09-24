#!/usr/bin/env node
// release.mjs — 把本 skill 发布到安装目录（~/.zcode/skills/deck-studio）
//
// 开发在仓内进行；版本定稿后运行本脚本发布。目标若是软链则移除链接，
// 若是旧发布则整体替换——安装目录永远等于当前仓内内容。
// 用法: node deck-studio/scripts/release.mjs

import { cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = join(homedir(), '.zcode', 'skills', 'deck-studio');

if (!existsSync(join(SRC, 'SKILL.md'))) { console.error('release 必须在 deck-studio 目录结构下运行'); process.exit(2); }

// 软链 → 删链接本身；旧发布目录 → 整体替换
const link = join(process.env.HOME ?? homedir(), '.zcode', 'skills', 'deck-studio');
try {
    const st = (await import('node:fs')).lstatSync(link);
    if (st.isSymbolicLink()) { rmSync(link); console.log('已移除软链'); }
    else if (st.isDirectory()) { rmSync(link, { recursive: true, force: true }); console.log('已清空旧发布'); }
} catch { /* 首次发布：目标不存在 */ }

cpSync(SRC, DEST, { recursive: true });
const count = (function walk(d) { return readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(join(d, e.name)) : 1), 0); })(DEST);
console.log(`已发布 ${count} 个文件 → ${DEST}`);
