// deck-studio/scripts/verify/load-playwright.mjs
// 改编自 AICO-PPT@4b5fcdf scripts/verify/load-playwright.mjs：
// 移除 desktop-renderer 宿主渲染分支（deck-studio 仅独立运行，连本机浏览器），
// 保留 PLAYWRIGHT_CORE 环境变量 → 裸 import('playwright-core') 两条解析路径。
// 'playwright-core' 裸说明符从本脚本位置向上查找 node_modules，
// 安装形态下命中技能目录内 vendor 的 node_modules（install.mjs 写入）。

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function chromiumLaunchOptions(environment = process.env) {
  const executablePath = environment.AICO_BROWSER_EXECUTABLE;
  if (executablePath === undefined) return { channel: 'chrome', headless: true };
  if (!executablePath.trim()) throw new Error('AICO_BROWSER_EXECUTABLE 不能为空');
  return { executablePath, headless: true };
}

export async function loadChromium() {
  const candidates = [process.env.PLAYWRIGHT_CORE, 'playwright-core'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const mod = await import(candidate);
      return (mod.default ?? mod).chromium;
    } catch {}
  }
  throw new Error(
    `无法加载 playwright-core（已尝试: ${candidates.join(' → ')}）。` +
    '请运行技能自带的一键安装（node install.mjs），或用 PLAYWRIGHT_CORE 指向 playwright-core 所在目录。');
}

/* —— 浏览器候选（win 内网常见：只装 Edge 没 Chrome → 自动回退，零配置）—— */
export function browserCandidates() {
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const lf = process.env['LOCALAPPDATA'] || join(process.env.USERPROFILE || '~', 'AppData', 'Local');
  if (process.platform === 'win32') return [
    join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(lf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  if (process.platform === 'darwin') return [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
          '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}

/* 统一启动入口：channel:chrome 优先；机器没有 Chrome 时按候选回退本机浏览器。
   所有 verify/html2pptx 脚本一律走这里，不再直接 chromium.launch。 */
export async function launchChromium(chromium, environment = process.env) {
  const opts = chromiumLaunchOptions(environment);
  if (opts.executablePath) return chromium.launch(opts);       // 显式指定：不回退（用户意图优先）
  try {
    return await chromium.launch(opts);
  } catch (e) {
    for (const candidate of browserCandidates()) {
      if (existsSync(candidate)) {
        console.error(`[deck] 本机无 Chrome，回退浏览器: ${candidate}`);
        return chromium.launch({ executablePath: candidate, headless: true });
      }
    }
    throw e;
  }
}
