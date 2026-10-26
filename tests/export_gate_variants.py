#!/usr/bin/env python3
"""export_gate_variants.py — 导出保真门禁的回归变体注入器

从一份"干净"的导出产物合成五类历史 bug 变体，逐一跑 export_assert.py，
每类必须被对应断言拦截（漏网即门禁退化）：

    文字重复   → ③ 文本去重
    整页遮挡   → ⑥ 大面积遮挡（整页级）
    中型盖字   → ⑥ 遮挡启发式（盖 ≥10 条文字）
    媒体爆炸   → ⑤ 媒体体积
    文字丢失   → ② 文本存在性

用法：
    1. 先留一份干净产物：node scripts/verify/export_check.mjs <deck.html> --keep
       （产物在 /tmp/deck-export-check/export.pptx，期望值在 expect.json）
    2. python3 tests/export_gate_variants.py [export.pptx] [expect.json]
"""
import copy
import json
import shutil
import subprocess
import sys
from pptx import Presentation
from pptx.util import Emu
from pptx.dml.color import RGBColor

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/deck-export-check/export.pptx'
EXPECT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/deck-export-check/expect.json'
ASSERT = '/Users/yuanbo/frontend-slides/deck-studio/scripts/verify/export_assert.py'


def variant(name):
    dst = f'/tmp/gate_variant_{name}.pptx'
    shutil.copy(SRC, dst)
    return dst, Presentation(dst)


def save(name, prs):
    prs.save(f'/tmp/gate_variant_{name}.pptx')


def run_assert(path):
    r = subprocess.run(['python3', ASSERT, path, EXPECT, '--full'],
                       capture_output=True, text=True)
    fails = []
    for line in r.stdout.splitlines():
        try:
            d = json.loads(line)
            if not d.get('ok'):
                fails.append(d['name'])
        except json.JSONDecodeError:
            pass
    return fails


cases = {}

# ③ 文字重复：复制一个标题文本形状
prs = Presentation(SRC)
slide = prs.slides[1]
tgt = next(sh for sh in slide.shapes if sh.has_text_frame and sh.text_frame.text.strip())
el = copy.deepcopy(tgt._element)
slide.shapes._spTree.append(el)
prs.save('/tmp/gate_variant_dup.pptx')
cases['文字重复→③'] = '/tmp/gate_variant_dup.pptx'

# ⑥a 整页遮挡：顶部加不透明整页矩形
prs = Presentation(SRC)
sh = prs.slides[1].shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
sh.fill.solid(); sh.fill.fore_color.rgb = RGBColor(0x10, 0x30, 0x5C)
prs.save('/tmp/gate_variant_cover.pptx')
cases['整页遮挡→⑥'] = '/tmp/gate_variant_cover.pptx'

# ⑥b 中型盖字：不透明矩形盖住上半区文字群
prs = Presentation(SRC)
sh = prs.slides[1].shapes.add_shape(1, Emu(int(prs.slide_width * 0.30)), Emu(int(prs.slide_height * 0.12)),
                                    Emu(int(prs.slide_width * 0.55)), Emu(int(prs.slide_height * 0.35)))
sh.fill.solid(); sh.fill.fore_color.rgb = RGBColor(0x10, 0x30, 0x5C)
prs.save('/tmp/gate_variant_cover2.pptx')
cases['中型盖字→⑥'] = '/tmp/gate_variant_cover2.pptx'

# ⑤ 媒体爆炸：注入 3MB 假媒体
import zipfile
with zipfile.ZipFile(SRC, 'r') as zin:
    items = [(i, zin.read(i.filename)) for i in zin.infolist()]
with zipfile.ZipFile('/tmp/gate_variant_media.pptx', 'w', zipfile.ZIP_DEFLATED) as zout:
    for info, data in items:
        zout.writestr(info, data)
    zout.writestr('ppt/media/image99.png', b'\x89PNG\r\n\x1a\n' + b'\x00' * (3 * 1024 * 1024))
cases['媒体爆炸→⑤'] = '/tmp/gate_variant_media.pptx'

# ② 文字丢失：清空一处卡片标题
prs = Presentation(SRC)
for sh in prs.slides[1].shapes:
    if sh.has_text_frame and sh.text_frame.text.strip() == '故障即中断':
        sh.text_frame.text = ''
        break
prs.save('/tmp/gate_variant_missing.pptx')
cases['文字丢失→②'] = '/tmp/gate_variant_missing.pptx'

fail = 0
for name, path in cases.items():
    caught = run_assert(path)
    if caught:
        print(f'  ✓ {name}：被 {caught[0].split(" ")[0]} 拦截')
    else:
        print(f'  ✗ {name}：漏网！门禁退化')
        fail += 1
sys.exit(1 if fail else 0)
