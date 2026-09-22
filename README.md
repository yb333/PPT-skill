# frontend-slides — PPT 技能研发仓

HTML 演示技能（frontend-slides）的版本控制之家：技能本体 + 工具脚本 + 参考资料。
技能优化重构工作在本仓进行；deck 成品不进本仓（属各项目自己的文档，如 design-dev-agent 的 `docs/ppt/`）。

## 目录

```
frontend-slides/
├── SKILL.md                 # 原技能本体（已冻结，不动——融合工作在 deck-studio/ 进行）
├── STYLE_PRESETS.md         # 原风格预设库（已冻结）
├── deck-studio/             # 新技能（融合重构工作线，标准 skill 结构）
│   ├── SKILL.md             # 精简核心（<500 行）
│   ├── references/          # 按需加载参考（theme/presets/layout/svg/animation/player/copywriting/process）
│   ├── scripts/verify/      # 适配版验证工具（溢出门禁 + 单页截图，契约见文件头）
│   └── assets/              # 测试 fixture（干净版/溢出版）
├── scripts/
│   ├── html2pptx/           # HTML → PPTX 导出管线（vendor 原样，待适配进 deck-studio）
│   └── verify/              # 渲染验证工具（vendor 原样，与上游可 diff）
├── docs/
│   ├── DECISIONS.md         # 融合重构决策记录（动工前先读）
│   └── aico-ppt-references/ # AICO-PPT 方法论文档（vendor 参考，见 THIRD-PARTY-NOTICE.md）
└── THIRD-PARTY-NOTICE.md    # vendor 代码归属与来源
```

## 安装（ZCode 技能挂载）

本机已按 symlink 方式挂载：

```bash
ln -s /Users/yuanbo/frontend-slides ~/.zcode/skills/frontend-slides
```

改动即时生效。若 ZCode 某版本不识别 symlink，退化为拷贝安装（`SKILL.md` + `STYLE_PRESETS.md` + 所需脚本目录）。

## 运行依赖（仅 vendor 脚本需要）

- Node ≥ 18、本机 Google Chrome（playwright 以 `channel:'chrome'` 连接）
- `npm install`（装 playwright-core）

验证工具用法（对 1920×1080 固定画布 deck；对现有自适应 deck 需先适配选择器）：

```bash
node scripts/verify/measure_overflow.mjs <deck.html> --all   # 溢出检测，退出码 0=全过
node scripts/verify/shot.mjs <deck.html> <页label> /tmp/p.jpg # 单页截图目检
python3 scripts/html2pptx/convert.py <deck.html> <out.pptx>   # PPTX 导出（--mode image|editable）
```

## 设计决策

- **deck 成品不放本仓**——它们是项目宣讲文档，归各自项目仓。
- **AICO-PPT 的华为品牌素材（assets/huawei-refs/）未 vendor**——版权明确排除在 MIT 外。
- **vendor 保持原样，适配改造在后续工作做**——与上游可 diff，改造后的脚本注明来源。
- 上游仓库：https://gitcode.com/AICO-Ascend/AICO-PPT （快照 commit 见 THIRD-PARTY-NOTICE.md）
