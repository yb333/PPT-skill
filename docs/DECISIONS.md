# 融合重构决策记录

> frontend-slides 技能融合重构（借鉴 AICO-PPT）的决策依据。新决策往上追加并附日期；被推翻的决策标记废除原因后保留。
> 来源：2026-09-22 两次会话（AICO-PPT 调研 + 落地方案对齐）。

## 已定决策

### D1 三条产品宪法（2026-09-22）

1. **色板主权**：主题色以我们的蓝色三层体系（`#3b82f6` / `#2563eb` / `#60a5fa` + 中性灰）为默认；AICO 的华为配色与三色体系不吸收。色板 token 化（CSS 变量 `--c-info` 等），预设 = token 覆盖。吸收进来的方法论文档一律 palette-agnostic——引用 token 名，不写死色值（为 editable 导出模式的 PPTX 主题色映射留好接口）。**预设优先级（2026-09-22 定案）：蓝色三层是默认路径；用户在风格选择阶段显式选了预设才豁免蓝色约束，色彩检查只对默认路径强制。**
2. **HTML 唯一事实源**：HTML deck 是本体，PPTX 是单向快照投影。单一导出入口（convert.py image 模式）；PPTX 无动画，每页 = 最终态快照；导出后断言页数平价。不承诺 pptx → html 回流修改。任何 deck（原生编写或从 ppt 提取）导出走同一条管线。
3. **表达力优先**：不为 PPTX 可移植性牺牲 HTML 表达力（动画、演示光标、响应式）。动画在导出时压平为最终态，而非要求作者少用动画。

### D2 不学模板化产出模式，差异化是人机协同共建（2026-09-22）

AICO 的优点分两半处理（2026-09-22 修正：先前"原生已有等价物"的说法过度——机制有，**体验**没有）：

- **产出模式不学**：不采用"选模板 → 填内容"，也不引入其 stage 容器与模板体系。我们的差异化是**人机协同共建**——保留大纲（Phase 1）与 Design Spec（Phase 2）两个用户确认闸门，章节结构与动画效果共同讨论产出。吸收 workflow.md 方法论时跳过其"选择模板"阶段。
- **放映体验明确吸收**：AICO 产出的 HTML"点开就像 PPT"（全屏播放、点击推进、逐项渐显），这块比我们现有的好，作为 v2 新能力落地（见 D7 播放器壳）。非全局照搬它的实现，用我们自适应画布重新实现。

### D3 Skill 标准化瘦身（2026-09-22）

新技能按标准 skill 构建方法组织（渐进式披露三层结构）：

- `SKILL.md` 精简核心（目标 <500 行）：触发描述 + 流程骨架 + 硬规则 + 指针；
- `references/` 按需加载：布局/视口适配、SVG 图表规范、动画词表、文案规范、色板 token 等查表类内容全部外移至此，SKILL.md 只留"何时读哪个文件"的指引；
- `scripts/` 适配版工具；`assets/` 模板骨架与测试 fixture。

原 SKILL.md（1632 行）的大段查表内容（Animation Patterns、Effect→Feeling 映射、CSS 基建全文等）在新技能中均按此原则拆出。

### D4 原 skill 冻结，新技能 deck-studio 并行开发、稳定后切换（2026-09-22）

- 根目录 `SKILL.md` / `STYLE_PRESETS.md` **冻结不动**；`~/.zcode/skills/frontend-slides` symlink 继续指向原版，现行使用零风险。
- 融合能力在仓内新目录 `deck-studio/` 开发（2026-09-22 定名，取代 `-v2` 后缀提案——正经名字即正式名，切换时无需改名接管），独立 symlink 挂载；试用期通过**显式点名**调用，避免与原技能触发竞争（试用期 description 收敛触发范围，切换日再改回强触发）。
- 切换机制（到达验收后）：原 `frontend-slides` 技能退役归档，`deck-studio` 保持自己的名字成为唯一正式技能。
- 切换验收标准（暂定，试用中可修）：真实项目试用 ≥2 次全程走通；溢出门禁退出码 0；导出页数平价且 PowerPoint/WPS 打开正常；含 reveal 动画的页面导出快照无空白；播放器壳在 Chrome/Safari 全屏放映正常。

> （2026-10-28 收尾：切换早已完成，根 `SKILL.md` / `STYLE_PRESETS.md` 按「退役归档」删除——git 历史即归档，冻结保留的过渡安排结束；仓内不再有任何旧技能文件，deck-studio/ 是唯一技能。）

### D5 vendor 纪律（2026-09-22，沿袭建仓决策）

根目录 `scripts/` 保持 vendor 原样（与上游 AICO-PPT@4b5fcdf 可 diff）；适配副本进 `deck-studio/scripts/`，文件头注明来源与改动点。适配四要点（deck ↔ 工具契约）：

1. 画布选择器 `.stage .slide-canvas` → `.slide`（viewport 1920×1080 下我们的 100vw/100vh 页恰为 1920×1080，deck 结构不变）；
2. 页标识：`section[data-label]`（新 deck 规范要求携带；工具对老 deck 回退为"序号 + 首标题"）；
3. `.reveal` 强制可见 + 动画暂停后再测量/截图（防空白快照、防漏测）；
4. 隐藏 deck 杂物：nav-dots / progressBar / pres-cursor / keyboard-hint（对齐打印媒体已隐藏的同类清单）。

**2026-09-22 冒烟修正（重要）**：vendor 契约"内层裁切只报告不判失败"对我们**不可用**——deck-studio 的 `.slide-content` 自带 overflow:hidden 双保险，内容超高时 slide 级溢出恒为 0，真实丢内容全部表现为内层裁切（fixture 实测：16×80px 列表 slide Y=0、内层 +203px）。已升级门禁判定：**slide 级溢出 >0 或内层裁切 >6px 均判失败**（6px 阈值容舍入与刻意省略号微裁切；试用后可调）。播放器杂物类名同时标准化为 `.deck-progress` / `.nav-dots` / `.pres-cursor` / `.pres-cursor-hint` / `.player-hint`，写入 SKILL 契约。

### D6 动画申报制：默认零动画，七机制词表（2026-09-22 修订，取代初版两层策略）

试用反馈"动画冗余过度"诊断成立：默认把 reveal 撒在每页标题/主体上是**仪式化入场**，不携带信息。修订：

- **通用层收缩为 chrome**（页面过渡、聚光灯、进度条）；**内容动画全部归申报制**——一页默认完全静态，申报时每处动画必须回答三判据之一（分块节奏/引导注意/表达过程），答不上来不做；
- **七机制词表**（animation.md）：巡游 `t`（含 gate 停顿/反向流动/状态 overlay）、走查高亮 `w`（常驻不藏，支持联动）、分块步进 `c`、自动连播 `seq`、一次性脉冲 `pulse`、状态变更、count-up。新增"流转"与"状态变化"为第一公民（用户明确要求：动画不止出现/消失，还有动作流转与状态变化）；
- **语义参数**：方向（正向=执行/反向=回改）、时序（同时=并行、停顿=等人）、色彩（琥珀=等待、红=回退）是语义约定，申报必填语义理由；
- **预算**：每页至多一个旗舰动画；步数 0–3 常态、硬上限 5；移动 300–650ms；浏览模式永远全显静态；
- **工程不变式**：终态 = 静态整页（fx 层清空即还原，门禁/截图/缩略图/导出零适配）；讲者主权（点击快进、闸口确认、reduced-motion 直达终态）；声明式 DECK_STEPS 数据（与 AICO data-step 语义同构）。
- 依据案例 emp deck 逐页分析沉淀：形态页流水线贯通（闸口停顿=人在决策的理念表达）、机制页回路巡游（判定分叉）、场景页并行合流、协同页 spec 流动+表格走查、矩阵行走查+阻塞项脉冲。

### D7 舞台框架：固定画布 + 双模式（2026-09-22 定案，取代初版播放器壳方案）

初版 v2 沿用自适应滚动架构 + IntersectionObserver 渐显，试用暴露**结构性缺陷**（白页事故）：`html/body{height:100%}` + `body{overflow-x:hidden}` 使 body 成为实际滚动容器，而 `scroll-snap-type/scroll-behavior` 挂在不再滚动的 html 上——双滚动器精神分裂（实测 docH=1080=一屏、scrollY 恒 0），reveal 可见性外包给 IO 后，不同浏览器/内嵌 webview 解析不一致即整页 opacity:0 全白。**判决：滚动架构退役**，采纳 AICO 的舞台框架，用我们自己的实现：

- **固定 1920×1080 逻辑画布**：`.deck-fit` 缩放适配窗口（transform scale，居中 letterbox 于中性底上，投影阴影），页内容用 px 排版。打开即"一页就是一页"的 PPT 观感；导出像素可预测（方案 B 事实上落地）。
- **双模式**：**浏览模式**（默认）= 全部页纵向堆叠成**无缝长页**，`.deck-stage` 容器内自由滚动（像 PDF 阅读器；2026-09-22 按用户反馈从逐页手势改回连续滚动），每页独立投影卡片，键盘/缩略图侧栏做页级精确定位，reveal 全显供阅读；**放映模式**（F 或工具条）= 浏览器全屏（被拒绝时降级为纯放映 chrome），单页 letterbox，杂物淡出，reveal 进入节拍步进（点击/→ 逐条放出，放完翻页），末页两次确认退出，P 聚光灯可用。
- **chrome 单一聚合**（2026-09-22 按用户反馈）：页码/导航类界面只保留一处——左上角单一玻璃工具条（☰ 目录 + 页码 + ▶ 放映）；独立页码胶囊与 nav dots 取消（页级跳转由缩略图侧栏与键盘承担），侧栏点缩略图跳页不关栏、点侧栏外即关。
- **根文档零滚动、零 IO**：滚动只发生在 `.deck-stage` 容器内且换页/判页是显式逻辑（滚动事件 rAF 回收 current，不用 IntersectionObserver）——白页 bug 类结构性消失。

### D8 页型库默认、自绘例外（2026-09-22）

AICO 的板式作为**默认版式词汇表**吸收（`deck-studio/references/layouts.md`）：封面/目录/章扉/内容页骨架/卡片网格/左图右文/流程条/对比两栏/表格混排/全幅图·截图对照/KPI 数据带/金句页/结语页。**大部分场景直接选库内页型**；自绘 SVG 只留给库表达不了的机制/架构/流程图。同时吸收其设计刻度（palette-agnostic）：画布 1920×1080、内容页 padding 56px 90px、eyebrow 18px mono、标题 46px（密页 40–42）、**正文地板 21px**、字号刻度 {13,15,17,19,21,24,27,30}、统一卡片骨架（白底/1px 细边/14px 圆角/同构兄弟卡）、审美硬要求与"1080 塞入铁律"。与 D2 的关系：否决的是"选模板→填内容"的生产流程，采纳的是成熟版式作为生成默认——Phase 1/2 人机协作闸门不变。

### D9 真实案例动画定案：流线语言 + 机制速查表 + 金句退役（2026-09-24）

tech-review deck（首个真实案例）定稿后动画构建实战收口：①动画=流线语言（flow/flows 撑大段
沿箭头流转 + fpulse 到站即逝 + pulses 同步脉冲），持久染色（lit/wseq/w/state/veil）与光点飞行
（move）退役；②机制按内容形态对号入座（速查表沉淀于 references/animation.md 动画地图节）；
③金句/结论后置（sumhide/sumshow）退役——触发时机不一致、效果不佳，总结条常显；
④引擎纪律实战验证：唯一源五件套 + sync-engine（JS 与 FX CSS 均标记块）+ 门禁四件套
（sync --check / e2e / overflow / 实拍 fx 计数）；⑤实战修复并沉淀：按键 ack 确定性等待、
busy .finally 兜底、序列绑定页号防串页、CSS 副本漂移也要标记块管。

**发布机制（2026-09-24）**：skill 安装目录（~/.zcode/skills/deck-studio）不再软链到仓，改为定稿后由
`deck-studio/scripts/release.mjs` 整体复制发布——仓只做开发，安装目录永远等于最近一次发布的定稿内容。
（2026-10-26 修正：release 曾裸 cpSync 漂移出两处缺陷——__pycache__ 缓存随包、THIRD-PARTY-NOTICE
未随包；改为复用 install.mjs 导出的 publishSkill 发布原语，两通道同一份过滤+归属逻辑。同日
install --check 补 python-pptx 探测——CLI 高保真导出与 Mode B 提取硬依赖该 pip 包，原先只查
python 可执行文件会假绿。）
vendor 导出工具 html2pptx 自根 scripts/ 收编进 skill（导出是承诺功能，必须随包分发）；测试夹具移至
仓根 tests/（非成品内容）；skill 成品内不保留研发史叙事与本地路径指针。

### D10 editable 导出：img data-URL 直通，照片不再重拍为 2x PNG（2026-10-20）

指标编码链路 deck 实测暴露：云山照片封面经 elementPng（foreignObject + 2x canvas → PNG）重拍后单图 5MB，
4 页 deck 导出 11.6MB。补丁：exporter.js elementPng 对 `<img>` 且 src 为 `data:image/(jpeg|png);base64`
且无 filter/transform/opacity 的元素直通原始字节（返回 {blob, ext}），媒体名按实际格式 `.jpg`/`.png`；
消费端兼容旧 Blob 返回。效果：同 deck 导出 1.6MB。另记录 editable-scene.mjs 两个未修坑（deck 层规避）：
SVG `opacity` 属性不并入 fill alpha；`opacity<1` 触发堆叠上下文使背景 emit 升到顶层——半透明泳道导出
成顶层实心块。规避纪律：SVG 不用 opacity 属性（预混色），背景矩形在 defs 后最先绘制。

### D11 deck 固定件预制化：init-deck 脚手架（2026-10-20）

指标编码链路 deck 全程暴露"固定件手工组装"事故五起（漏 chrome、引擎块吞作者数据区、pptxBtn 样式
静默丢失、封面自建后返工云山模板、document.title 残留）。定案：**deck = 固定件 + 内容件**，固定件
（头部 CSS/chrome/封面/结束页/引擎块/作者数据区/document.title）一律脚本预制，模型只产内容 section；
不违背 D2——内容页仍人机共建，预制的是非内容件。落地 `scripts/init-deck.mjs`：
`node init-deck.mjs <out> --title … [--date] [--template yunshan|none] [--sections N]`，产出即含
正确 chrome 与引擎标记块的骨架，自动跑 sync-engine；云山为缺省模板（内部汇报），none 为通用蓝板；
云山封面/结束页大图压缩后内嵌（143KB/116KB）。模板碎片沉淀于 `assets/templates/scaffold/`。
Level 2（chrome 纳入 sync-engine 标记块管理，存量 deck 一条命令升级 chrome）另议。
同批导出修复：editable-scene 复杂元素光栅化时裸文本节点不隐藏 → 卡片标题/总结条文字在 PPTX 里
双份（deck 层规避：单侧边框改嵌套色条 div）；path 折线分解错位（规避：折线拆 line）。
**遗留**：导出保真未进门禁（export_check.mjs 提案），A2/A3/A4 引擎坑未修。

### D12 编辑能力进 deck：内置内核 + 三通道保存（2026-10-20）

用户核心诉求：双击打开 HTML → ✎/E 进入编辑 → 两分钟改完字 → Ctrl/S 保存（浏览器弹替换原文件）——
细微修改不该绕道对话。浏览器安全模型不允许 file:// 页面静默写自身，故保存为三通道按能力自动分发：
① deck-serve 在线（bootstrap 注入 `__DECK_SERVE`）→ POST 写回原文件 + 保存门禁 + SSE toast（power path）；
② Chromium FS Access（file:// 下 showSaveFilePicker 实测可用，isSecureContext=true）→ 系统另存对话框
   替换原文件，无服务；③ 其他 → 下载编辑后 HTML。导出 PPTX 永远基于当前编辑态，与保存解耦。
落地：编辑器同源化——serve/editor.js 升格为 `assets/effects/editor.js`（唯一源），sync-engine 内嵌进
deck 引擎块（旧 deck 由 deck-serve 兜底注入），editor.css 并入 editor.js 自注入（随 [data-deck-editor]
序列化剥除）；deck-serve 对内嵌 deck 只注入 bootstrap，新增 `--open`。按键修正：E 在观景态即可进入
编辑（原实现 E 只能退出，与"按 E 进入"的承诺不符）。验证：channel_test 三通道 11 断言全过（含序列化
产物引擎块完好、无编辑器 UI 残留）；期间服务端拒收了一次旧引擎块写回——引擎纪律按设计工作。
定位纪律：编辑态=轻改（文字/位置/颜色），结构性修改仍走对话；deck-serve 仍是唯一跑完整门禁的保存
通道，客户端保存附轻量溢出提示（后续项）。

**D12 实测追加（同日）**：Mac 触控板实测三修——① 按住即拖（不再要求先选中），流式元素首次拖动自动转为 slide 内绝对定位（PPT 手感，逐属性入撤销栈）；② 字号刻度向下扩展至 9–12px（覆盖 SVG 小字）；③ 点击空白即提交并取消选中。过程中揪出并修复一个更深的缺陷：mousedown preventDefault 会连带吞掉后续 click/dblclick（点击选中与双击改字全哑），改为拖拽起手后 userSelect:none 压原生选字、mousedown 只 stopPropagation；双击改字改由 click detail===2 触发。channel/ux 测试 21 断言全过。

### D13 导出保真门禁（第五件套）+ 两档能力分级（2026-10-21）

**export_check.mjs + export_assert.py**：对 deck 实际触发 ⤓ 导出，对 PPTX 做六断言——①页数平价
②文本存在性（去空白顺序拼接比对，容忍导出器按渲染行拆分）③文本去重（出现次数不超 deck 期望，
拦"复杂元素光栅化带字+可编辑文字双份"）④图片数量配额（deck img+3，拦"复杂背景整块光栅化"）
⑤媒体体积（单件 <2MB，拦照片重拍巨图）⑥遮挡启发式（--full：z≥3 的大形状盖住 ≥10 条**z 更低**
文字 → 拦"半透明背景实心化+升顶盖顶"；60% 整页盖顶并入同断言）。标定：本 deck 全过零误报；
五个历史 bug 合成变体（重复/整页盖/媒体巨图/文字丢失/中型盖字）逐个精准拦截。运行成本秒级
（--fast）到半分钟（--full）；依赖 python-pptx（清单内）。Phase 5 升为五件套，交付前必跑。

**两档能力分级**（取代多级梯队设想）：面向的模型/agent 能力各异，档位判定机械化——
`scripts/probe.mjs`（node/playwright/python/soffice 探测 + 宿主视觉声明 AICO_VISION/--vision），
输出 vision/novision 两档（规则见 references/tiers.md）。novision：机器门禁照跑；禁目检（显式
跳过并告知用户）；复杂 SVG 自绘降级简单版式并标注待补。分级只作用于内容件与验收步骤——固定件
（D11 脚手架/引擎/编辑器）脚本保证，任何档位正确。低级模型不在支持范围（用户定案）。
参数化 SVG 片段库为 novision 档未来方向：不预铺量，遇真实场景收一个。

**D13 实施追加（同日）**：D10 遗留四坑中三个已修——A1（elementPng background 类克隆
color:transparent 隐藏裸文本）、A2（SVG opacity/fill-opacity 并入 fill/stroke/text alpha，四分支）、
A4（freeform 坐标归一化到声明的 path 空间——units 不一致导致折线放大甩出画面，已建
tests/fixture-svg-opacity.html 稳定复现）。回归资产：tests/export_gate_variants.py（五类历史 bug
合成变体，逐一断言拦截）+ fixture + channel/ux 测试。剩余：A3 排序键（A2 修复后实际伤害大减，
半透明层升顶视觉可接受，暂不动）、Level 2 chrome 纳管（触发条件：同一旧 deck 第二次需要 chrome
升级）、参数化 SVG 片段库（按需沉淀）。

## 待定项

- git 远端备份是否配置。
- editable 导出模式：已适配 deck-studio 契约并在 tech-review deck 实战验证，且已升级 **SVG 图表
  分解为原生可编辑对象**（2026-10-13）：rect/line/text → 形状/连接线（含箭头/虚线/翻转）/文本框，
  渐变填充随对象保留；仅 path 弧线 v1 光栅化。全 deck 779 个原生对象（此前为 14 张整页图），
  图表内每个框/每条线/每段字均可在 PPT 中直接调整。image 导出此前已实战验证
  （14/14 平价、16:9 满屏图、终态=去 chrome/去动画层/方角满幅）。分工：放映/分享用 image（按钮
  一键，秒级）；需要改字的场景用 editable（--mode editable，分钟级，SVG 图内文字不可编辑）。

### D13 技能主体纯净性：安装器等项目工具移出 deck-studio/（2026-10-28）

用户定则：项目产出物是技能，`deck-studio/` 必须只含技能执行所需——SKILL.md、references、
assets、scripts（运行时工具）、config.json、vendor node_modules。安装器（install.mjs /
install.sh / install.bat）、发布器（release.mjs）、归属文件、docs / tests 一律住项目侧
（仓库根），不进技能目录。落地：四件套移至仓库根，install.mjs 按"安装器与 deck-studio/
并排"重写路径解析（SKILL = HERE/deck-studio，仓库根与离线包根同构）；--pack 离线包形态
改为 installer + deck-studio/ 并排（内网在包根运行安装器即装）；release.mjs 同移根目录，
复用 install.mjs 导出的 publishSkill。安装/发布产物随之变纯：不含任何安装器文件，仅多
THIRD-PARTY-NOTICE（归属描述技能内 vendor 派生代码，随装携带）与 _install_meta.json
指纹两个安装期写入。旧契约"技能本体即安装包（deck-studio/ 目录整个拷走就能装）"随之废除。
