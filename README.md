# frontend-slides — PPT 技能研发仓

HTML 演示技能（frontend-slides）的版本控制之家：技能本体 + 工具脚本 + 参考资料。
技能优化重构工作在本仓进行；deck 成品不进本仓（属各项目自己的文档，如 design-dev-agent 的 `docs/ppt/`）。

## 目录

```
frontend-slides/
├── SKILL.md / STYLE_PRESETS.md  # 原技能（已冻结，不动——融合成果在 deck-studio/）
├── deck-studio/             # 技能本体（纯净，只含技能执行所需：SKILL.md + references/
│                            #   assets/ + scripts/ + config.json + vendor node_modules）
├── install.mjs              # 一键安装器（项目工具，不进技能目录；--check/--pack/--target）
├── install.sh / install.bat # mac/linux 与 win 双击入口
├── release.mjs              # 研发发布器：deck-studio/ → ~/.zcode/skills/deck-studio
├── scripts/                 # vendor 原样（html2pptx/verify，与上游 AICO-PPT 可 diff）
├── docs/                    # DECISIONS.md 决策记录、成品 deck 与方法论文档
├── tests/                   # 门禁回归测试与 fixture
└── THIRD-PARTY-NOTICE.md    # vendor 代码归属与来源
```

## 安装 / 发布

安装器住仓库根，技能本体取同级 `deck-studio/`（克隆即完整，playwright-core 已随仓 vendor）：

```bash
node install.mjs             # 全局安装 → ~/.config/opencode/skills/deck-studio（纯技能本体）
node install.mjs --check     # 只查环境（Node/浏览器/playwright-core/Python+python-pptx）
node install.mjs --pack      # 打离线包（installer + deck-studio/ 并排，拷去内网在包根安装）
node release.mjs             # 研发机发布 → ~/.zcode/skills/deck-studio
```

win 双击仓库根 `install.bat`。安装产物只含技能执行所需 + MIT 归属 + `_install_meta.json` 指纹，不含安装器。

## 运行依赖（仅 vendor 脚本需要）

- Node ≥ 18、本机 Chrome 或 Edge（playwright 连接，无 Chrome 自动回退）
- playwright-core 已随仓 vendor（`deck-studio/node_modules/`）；Python+python-pptx 可选（仅 CLI PPTX 管线）

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
