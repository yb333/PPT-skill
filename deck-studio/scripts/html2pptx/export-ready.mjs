/** 图片与可编辑导出共用同一就绪条件；补丁失败时禁止导出回滚后的旧内容。 */
export async function prepareExportPage(page, { patchTimeoutMs = 90_000 } = {}) {
  await page.waitForSelector('section.slide', { timeout:30_000 });   // deck-studio 契约
  let timedOut = false;
  try {
    await page.waitForFunction(() => (
      !document.getElementById('huawei-deck-editor-patches')
      || ['applied', 'failed'].includes(window.HuaweiDeckEditorPatchStatus?.state)
    ), undefined, { timeout:patchTimeoutMs });
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    timedOut = true;
  }
  const replay = await page.evaluate(() => {
    const script = document.getElementById('huawei-deck-editor-patches');
    if (!script) return null;
    try {
      const patches = JSON.parse(script.textContent);
      if (!Array.isArray(patches)) throw new Error('补丁必须是数组');
      return { count:patches.length, status:window.HuaweiDeckEditorPatchStatus ?? null };
    } catch (error) { return { count:null, status:{ state:'failed', error:{ message:error.message } } }; }
  });
  if (replay && (timedOut || replay.status?.state !== 'applied'
    || replay.status.expected !== replay.count || replay.status.applied !== replay.count
    || replay.status.adopted !== replay.count)) {
    const error = replay.status?.error;
    const reason = error?.message || (timedOut ? '等待补丁应用超时' : '补丁应用数量不完整');
    throw Object.assign(new Error(`PPTX 导出已中止：补丁未完整应用（${reason}${error?.failedActionId ? `；补丁 ${error.failedActionId}` : ''}）。请在编辑器中修复后重试。`), { code:'PPTX_PATCH_REPLAY_FAILED' });
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.addStyleTag({ content:`
    /* deck-studio 舞台静态化：取消缩放、页全显纵向堆叠（每页 1920×1080 原位截图） */
    html,body{overflow:visible!important;height:auto!important}
    .deck-stage{position:static!important;overflow:visible!important;height:auto!important}
    .deck-fit{transform:none!important;width:1920px!important;height:auto!important;box-shadow:none!important;margin:0 auto!important}
    section.slide{position:relative!important;inset:auto!important;visibility:visible!important;opacity:1!important;display:flex!important;border-radius:0!important;box-shadow:none!important}
    /* 播放器杂物隐藏 */
    .deck-bar,.deck-menu,.deck-sidebar,.deck-progress,.nav-dots,.pres-cursor,.pres-cursor-hint,.player-hint,.keyboard-hint{display:none!important}
    /* 快照 = 最终态：动画元素不属于内容，整层隐藏 */
    .fx-layer,.ambient-layer{display:none!important}
    /* reveal 终态 + 动画暂停 */
    .reveal,.reveal-scale,.reveal-left,.reveal-blur{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
    .slide .reveal:not(.shown){opacity:1!important}
    *{animation-play-state:paused!important}
    /* 旧 AICO 契约兼容（对 deck-studio 为 no-op） */
    .glassbar.railtoggle,.glassbar.navbar,.glassbar.modebar,.railpanel,.railfoot,.hint,.noteschip,#__deck_loading_overlay,#__bundler_loading{display:none!important}
    img[alt="HUAWEI"],img[data-brand-logo]{right:30px!important}
    .slide-canvas *{animation-play-state:paused!important;caret-color:transparent!important}
    .slide-canvas .build{opacity:1;transform:none;filter:none}
  ` });
  await page.evaluate(() => {
    document.querySelectorAll('section.slide .reveal').forEach(el => el.classList.add('shown'));
    document.querySelectorAll('.slide-canvas .build').forEach(el => el.classList.add('in', 'show', 'visible'));
    document.querySelectorAll('svg').forEach(svg => svg.pauseAnimations?.());
  });
}
