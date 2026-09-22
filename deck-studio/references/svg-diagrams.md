# svg-diagrams.md — 架构图 / 流程图 / 图表规范（SVG 优先）

**⚠️ 所有架构图、流程图、分层图必须 inline SVG。禁止 emoji 图、ASCII 文字图。**

## SVG 铁律（改图先读）

| 规则 | 说明 |
|------|------|
| 整组移动用 transform | `<g transform="translate(x,y)">`，**禁止逐元素改坐标**（会改乱不相关元素） |
| 改内容必须同步调容器 | 增删内容后 viewBox 与外层容器尺寸**同步更新**；加文字要加高，删内容要回收空间 |
| 标签重叠时错开放 | 多个标注不挤同一 y 坐标；一上一下，每个信息要素独立视觉空间 |
| 区域精确包裹内容 | 分层区域的 x/width 与内部节点坐标严格对应 |
| 容器适配内容 | 卡片高度自适应内容；内容少就该矮，不强行统一高度 |

## 字号与视觉层级

- 投影可读下限 1.1–1.2vw，在此范围调内容长度，不反着来
- SVG 内文字 ≥11px，卡片描述 ≥1.2vw，图例/脚注 ≥9px
- 关键数字放大加粗变色（≥14px，强调走 token）
- 字号是试出来的：给范围让用户选，不猜终值

SVG 字号放大映射（基准→放大）：7→8 极小标注；8→9 辅助说明；9→11 小标签；10→12 副标题；11→13 正文；12→14 小标题；13→15 模块标题；14→16 区域标题。同步 `--body-size`/`--small-size` +15%。

## 图表选型

| 场景 | 推荐 | 理由 |
|------|------|------|
| 递减/削减过程 | 瀑布递减图 | 直观展示"越砍越小" |
| 逐层过滤/拦截 | 漏斗图 | 天然传达"越来越少"，内放递减数字 |
| 对比/差异 | 左右对照卡片 | Demo vs Prod、问题 vs 方案 |
| 流程/流水线 | 横向流程图 | 分层区域 + 节点 + 箭头，节点均匀分布 |
| 数据要有参照 | 进度条 + 安全线 | 绝对数字无感，对比基准线才有感 |

字不如表、表不如图：讲方法论/原理/流程的页，图或表是主表达。简单对比用 CSS stat 卡；进度用 CSS 进度条；复杂图 inline SVG 画，或引 Chart.js CDN。

## 基本结构模板

```html
<svg viewBox="0 0 960 320" xmlns="http://www.w3.org/2000/svg"
     font-family="PingFang SC,Microsoft YaHei,sans-serif">
    <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6"
                refX="8" refY="3" orient="auto">
            <polygon points="0 0,8 3,0 6" fill="#64748b"/>
        </marker>
        <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#dbeafe"/>
            <stop offset="100%" stop-color="#bfdbfe"/>
        </linearGradient>
    </defs>
    <!-- 分层区域背景 -->
    <rect x="30" y="15" width="320" height="140" rx="10"
          fill="#e0f2fe" opacity=".5"/>
    <text x="190" y="35" text-anchor="middle" font-size="11"
          fill="#0369a1" font-weight="600">区域标签</text>
    <!-- 节点 -->
    <rect x="40" y="50" width="90" height="48" rx="8"
          fill="url(#gInfo)" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="85" y="70" text-anchor="middle" font-size="11"
          font-weight="700" fill="#1e293b">节点标题</text>
    <text x="85" y="86" text-anchor="middle" font-size="9"
          fill="#64748b">副标题</text>
    <!-- 箭头 -->
    <line x1="130" y1="74" x2="148" y2="74"
          stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>
</svg>
```

## 尺寸规范

- viewBox 宽固定 960，高按内容（320/400/500）；容器 CSS：`.diagram-wrap svg { width:100%; height:100%; max-height:100%; }`
- 字体：标题 11–12px，副标题 9–10px；节点 80–100×40–55px，`rx="8"`；箭头 stroke-width 1.5、marker 8×6；区域背景 opacity 0.5、rx 10
- **`font-size="12"` 无 px 后缀**——SVG 属性写 `12px` 会被静默忽略或渲染异常
- `<defs>` 合并时 gradient/marker id 不得冲突（分段生成后拼接时重点检查）

## 节点样式语义

- 人工确认/阻塞点：`stroke-dasharray="4 2"` + 琥珀填充（`#f59e0b`/`#fef3c7`）+ 加粗边框
- 关键产出：双线边框或加粗描边
- 可选/扩展：虚线边框 + 低透明度

## 愿景图原则

云端在上（云端 Agent 顶部）、左右结对（员工 ⬌ 本地 Agent 横向）、结对标记字号减半（0.9vw）、多成员表达团队协作（4+4）。

## 关键字高亮

```css
.key { color: var(--c-info); } /* 变色优先；需要更强再加深浅对比，不必整句加粗 */
```

应用在：痛点结论、方案核心价值、架构特点、核心步骤名、效果关键数字、演进关键能力。
