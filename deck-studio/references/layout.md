# layout.md — 固定画布与排版刻度（决策 D7/D8）

**画布 = 固定 1920×1080，零滚动。** 窗口适配由舞台的 `transform: scale()` 负责（player.md），页内排版全部用 **px**。旧的 100vw/100vh + clamp() + 断点 + IntersectionObserver 滚动架构在 v2 **正式废弃**（白页事故根因，见 DECISIONS.md D7）。

## 页面结构（从上到下）

内容页 padding `56px 90px`（章扉/问题/金句页 `108px 130px`）：

1. **eyebrow**：mono 小标签 `X.X · 中文 / ENGLISH`，18px，`letter-spacing: .2em`，强调色（`--c-exec`）；
2. **大标题**：46px（密页可 40–42），font-weight 600–700，`--text`；标题即观点（copywriting.md）；
3. **导语默认省略**——只有主体成立前必须交代、且标题和正文尚未表达的背景才写，21px `--text-sub`；
4. **主体**：`flex: 1; min-height: 0`——吃满剩余高度且能收缩，这两个属性是版式不塌的关键。

相邻内容页背景在 `#fff` / `#fafafa` 间交替，便于区分页界。

## 字号刻度（唯一一套，禁止手调小数）

| 用途 | 字号 |
|------|------|
| 散文地板（正文/卡片正文/要点/callout/结论） | **21px 最小** |
| 刻度 | `{13, 15, 17, 19, 21, 24, 27, 30}` |
| 大标题 | 46（密页 40–42） |
| eyebrow / 徽标 | 18 mono |
| 图元（坐标轴/紧凑表格/图内短标签） | 可 <21，但承担主要解释的段落仍按散文处理 |

字体：`"PingFang SC","Microsoft YaHei",sans-serif`（零依赖，不引 webfont）；数字/代码/mono 标签用 `ui-monospace, "JetBrains Mono", monospace`。**中文绝不能只挂 mono 字体**（无中文字形，投影发虚）。

## 统一卡片语汇

- 大卡片：白底、1px 浅灰细边（`#e7e7e7`）、14px 圆角；**同组、同层级、同语义角色的兄弟卡片完全同构**（背景/边框/圆角/阴影/内边距/字阶一致）。
- 卡片标题不得用整条彩色底板——黑字即可，需要分隔加 1px 浅灰底边；一卡只留一层标题。
- 只有文案明确表达**选中/推荐/当前/风险/结论差异**时才允许单卡高亮；平等并列项不得为构图单独高亮。

```html
<div style="background:#fff;border:1px solid #d5d9de;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-height:0;">
  <div style="padding:12px 16px;border-bottom:1px solid #e1e4e7;font-size:21px;font-weight:700;line-height:1.35;">卡片标题</div>
  <div style="padding:14px 16px;flex:1;min-height:0;color:#585860;font-size:21px;line-height:1.45;">卡片内容</div>
</div>
```

标准表格是独立语汇：表头 `--c-exec` 深蓝 + 白字居中粗体，全表黑边框（普通 1px、分组外框 3px）；列宽直接写 `th/td`，主空间给证据与说明；`flex:1;min-height:0` 占满主体。

## 密度上限（每页）

| 页型 | 上限 |
|------|------|
| 封面 | 主标题 + 副标题条 + 底部信息行 |
| 内容页 | 1 标题 + 4–6 要点，或 1 标题 + 2 段 |
| 卡片网格 | ≤6 卡 |
| 代码页 | ≤10 行 |
| 引用页 | 1 句（≤3 行）+ 署名 |

超出 → 拆页。抬字号后溢出**优先原地压**（收 line-height → 缩图 → 精简文字），实在装不下再拆。

## 审美硬要求

1. 布局服务于有效内容——`flex:1` 分配主体空间，不为填满画布加套话；
2. 图/截图按列宽放大填满——小图缩在中间四周留白是最常见的败笔；
3. 强调框默认中性灰，强调色只给文案已说明的差异；
4. 结论放进对应内容栏，不另起横贯整页的结论条；
5. 禁止无意义色块标题、装饰性标签泛滥——标签答不出"承载什么业务状态"就删；
6. 跨页统一优先于单页炫技——同类型卡片跨页同步一切样式；
7. **1080 塞入铁律**：任何一页必须塞进 1080 高，超出即被无声裁掉。

## 验证

每改一批页必跑机器门禁（SKILL.md Phase 5 命令），退出码非 0 修到 0。手工量高度的两个坑：section 被 `height:100%` 锁死时 `scrollHeight==clientHeight` 量不出溢出，临时设 `height:auto` 再比；缺 `*{box-sizing:border-box}` 时 padding 记账不一致，先补再量。

## 目检尺寸

舞台按窗口缩放，开发时以 1920×1080 为设计基准目检（shot.mjs 即此尺寸）；不必再测多分辨率——缩放保证了等比一致。
