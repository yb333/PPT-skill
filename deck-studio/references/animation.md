# animation.md — 动画两层策略与词表

## 两层策略（宪法 3 + 决策 D6）

| 层 | 内容 | 成本 | 何时呈现 |
|----|------|------|---------|
| **通用层** | reveal 入场、页面过渡、聚光灯、进度条等标准件 | ≈0（同一套 CSS/JS 复用） | **每次迭代全量带上**，讨论所见即所得 |
| **编排层** | 逐元素时序、SVG 分步绘制、滚动联动等定制动画 | 贵在内容迭代时的联动返工 | Design Spec 显式声明（元素+时机+效果）；**内容结构冻结后一次成型**；迭代期不重做，除非结构变更 |

编排层声明格式（写进 Phase 2 spec）：

```markdown
### 编排动画
- 元素: 漏斗图 5 层矩形 | 时机: 进入本页后逐层 | 效果: 自上而下依次显示（间隔 0.4s，reveal-scale）
- 元素: 箭头连线 | 时机: 层全部显示后 | 效果: stroke-dashoffset 划入
```

规则：动画按"知识节拍"成组纳入同一 step，不做零散点缀；场景用量参考 process.md 场景适配表（汇报少用、自读基本不用、授课按讲课节拍）。

## 通用层词表（entrance）

```css
.reveal {          /* 淡入上移（默认款） */
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s var(--ease-out-expo),
                transform 0.6s var(--ease-out-expo);
}
.slide.visible .reveal { opacity: 1; transform: translateY(0); }
/* 逐个错峰 */
.reveal:nth-child(1) { transition-delay: 0.1s; }
.reveal:nth-child(2) { transition-delay: 0.2s; }
.reveal:nth-child(3) { transition-delay: 0.3s; }
.reveal:nth-child(4) { transition-delay: 0.4s; }

.reveal-scale {    /* 缩放入场 */
    opacity: 0; transform: scale(0.9);
    transition: opacity 0.6s, transform 0.6s var(--ease-out-expo);
}
.reveal-left {     /* 左滑入场 */
    opacity: 0; transform: translateX(-50px);
    transition: opacity 0.6s, transform 0.6s var(--ease-out-expo);
}
.reveal-blur {     /* 模糊聚焦入场 */
    opacity: 0; filter: blur(10px);
    transition: opacity 0.8s, filter 0.8s var(--ease-out-expo);
}
.slide.visible .reveal-scale,
.slide.visible .reveal-left,
.slide.visible .reveal-blur { opacity: 1; transform: none; filter: none; }
```

缓动 token：`:root { --ease-out-expo: cubic-bezier(0.16,1,0.3,1); --duration-normal: 0.6s; }`

**契约提醒**：渐显类一律挂 `.reveal` 系类名 + `.slide.visible` 触发模式——验证与导出工具按此强显（导出取最终态快照，动画自由不受限）。

## 背景效果

```css
.gradient-bg {   /* 渐变网格 */
    background:
        radial-gradient(ellipse at 20% 80%, rgba(59,130,246,.25) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(37,99,235,.15) 0%, transparent 50%),
        var(--bg-page, #ffffff);
}
.grid-bg {       /* 网格纹理 */
    background-image:
        linear-gradient(rgba(30,41,59,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,41,59,.04) 1px, transparent 1px);
    background-size: 50px 50px;
}
```

（默认蓝板用上面 token 化颜色；预设场景按预设 token 现场调。）

## 交互效果（可选增强）

3D tilt 悬停（perspective + rotateX/Y 随鼠标位置）、磁性按钮、数字滚动计数、自定义光标拖尾。只在风格确需时加；移动端 768px 断点禁用重效果。

## Effect → Feeling 映射（选效果先定情绪）

| 情绪 | 手法 |
|------|------|
| Dramatic/Cinematic | 慢淡入（1–1.5s）、大缩放（0.9→1）、暗底聚光、视差、全幅图 |
| Techy/Futuristic | 霓虹辉光（box-shadow 强调色）、粒子 canvas、网格纹、等宽字体点缀、故障/乱序字 |
| Playful/Friendly | 弹簧缓动、大圆角、亮色/粉彩、浮动 bobbing |
| Professional/Corporate | 快而克制（200–300ms）、干净无衬线、精确对齐、少装饰、数据可视化主角 |
| Calm/Minimal | 极慢极微动、高留白、低饱和、衬线、内容为主 |
| Editorial/Magazine | 强字阶对比、pull quote、图文互嵌、破格网格、黑白 + 单强调色 |

## 性能与可访问性

- 动画只用 `transform` / `opacity`（合成层友好）；`will-change` 少用；scroll/mousemove 节流
- `@media (prefers-reduced-motion: reduce)` 全 deck 必含（见 layout.md 基建）
- 移动端：768px 断点降级/禁用粒子与重效果
