// deck-studio/scripts/verify/load-playwright.mjs
// 改编自 AICO-PPT@4b5fcdf scripts/verify/load-playwright.mjs：
// 移除 desktop-renderer 宿主渲染分支（deck-studio 仅独立运行，连本机 Google Chrome），
// 保留 PLAYWRIGHT_CORE 环境变量 → 裸 import('playwright-core') 两条解析路径。
// 'playwright-core' 裸说明符从本脚本位置向上查找 node_modules，
// 挂载方式（symlink 进 ~/.zcode/skills）下会命中研发仓根目录的 node_modules。

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
    '请在技能研发仓 /Users/yuanbo/frontend-slides 执行 npm install。');
}
