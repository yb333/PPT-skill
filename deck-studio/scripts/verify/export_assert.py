#!/usr/bin/env python3
# export_assert.py — 导出保真断言（被 export_check.mjs 调用）
# 用法: python3 export_assert.py <export.pptx> <expect.json> [--fast|--full]
# 输出: 每条断言一行 JSON {ok, name, detail?, warn?}
#
# 断言对照历史 bug：
#   ① 页数平价        → 导出缺页
#   ② 文本存在性      → 卡片文字丢失
#   ③ 文本去重        → 复杂元素光栅化带字 + 可编辑文字双份
#   ④ 图片数量        → 复杂背景整块光栅化成多余图片
#   ⑤ 媒体体积        → 照片重拍超大 PNG / CSS 渐变整页大图
#   ⑥ 大面积遮挡      → 半透明背景实心化+升顶盖住内容（--full）
import json
import re
import sys
import zipfile

from pptx import Presentation
from pptx.util import Emu

SLIDE_AREA_TOLERANCE = 0.60     # ≥60% 页面积的大形状
Z_FLOOR = 3                     # z 序前 3 位视为背景层（白底/背景图合法驻留区）
MAX_MEDIA_BYTES = 2 * 1024 * 1024
MAX_TOTAL_MEDIA = 8 * 1024 * 1024
PICTURE_ALLOWANCE = 3           # 每页允许的光栅图配额（deck img 数 + 此值：底图/品牌图/背景合成）
COVER_TEXT_MIN = 10            # 大形状盖住 ≥ 此数的文字形状 → 遮挡判定


def emit(ok, name, detail="", warn=False):
    print(json.dumps({"ok": bool(ok), "name": name, "detail": detail, "warn": bool(warn)}, ensure_ascii=False))


def iter_shapes(shapes):
    for sh in shapes:
        yield sh
        if sh.shape_type is not None and "GROUP" in str(sh.shape_type):
            yield from iter_shapes(sh.shapes)


def main():
    pptx_path, expect_path = sys.argv[1], sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "--full"
    exp = json.load(open(expect_path, encoding="utf-8"))
    prs = Presentation(pptx_path)
    fails = 0

    def fail(name, detail=""):
        nonlocal fails
        fails += 1
        emit(False, name, detail)

    # ① 页数平价
    if len(prs.slides) != exp["count"]:
        fail("① 页数平价", f"deck {exp['count']} 页，pptx {len(prs.slides)} 页")
        emit(False, "后续断言按现存页继续", "", True)
    else:
        emit(True, "① 页数平价", f"{len(prs.slides)} 页")

    # 媒体体检（⑤）
    media = []
    with zipfile.ZipFile(pptx_path) as z:
        for info in z.infolist():
            if info.filename.startswith("ppt/media/"):
                media.append((info.filename, info.file_size))
    big = [(n, s) for n, s in media if s > MAX_MEDIA_BYTES]
    total = sum(s for _, s in media)
    if big:
        for n, s in big:
            fail("⑤ 媒体体积", f"{n} {s // 1024}KB（阈值 {MAX_MEDIA_BYTES // 1024}KB）——照片类背景应直通原始字节或压缩")
    else:
        emit(True, "⑤ 媒体体积", f"{len(media)} 个媒体，最大 {max((s for _, s in media), default=0) // 1024}KB")
    if total > MAX_TOTAL_MEDIA:
        emit(False, "⑤ 媒体总体积", f"{total // 1024}KB 超阈值 {MAX_TOTAL_MEDIA // 1024}KB")
        fails += 1

    # 每页断言（②③④⑥）
    for idx, slide in enumerate(prs.slides):
        if idx >= exp["count"]:
            break
        label = f"第{idx + 1}页"
        exp_texts = exp["slides"][idx]["texts"]
        exp_imgs = exp["slides"][idx].get("imgs", 0)

        shapes = list(iter_shapes(slide.shapes))
        corpus, text_counts = [], {}
        pictures = 0
        for sh in shapes:
            st = str(sh.shape_type)
            if "PICTURE" in st:
                pictures += 1
            if getattr(sh, "has_table", False) and sh.has_table:
                for row in sh.table.rows:
                    for cell in row.cells:
                        t = cell.text_frame.text.strip()
                        if t:
                            corpus.append(t)
                continue
            if getattr(sh, "has_text_frame", False) and sh.has_text_frame:
                t = sh.text_frame.text.replace("\n", " ").strip()
                if t:
                    corpus.append(t)
                    text_counts[t] = text_counts.get(t, 0) + 1
        joined = re.sub(r"\s+", "", "".join(corpus))   # 导出器按渲染行拆分文本属正常行为：去空白后顺序拼接比对

        # ② 文本存在性
        missing = [t for t in exp_texts if len(re.sub(r"\s+", "", t)) >= 2 and re.sub(r"\s+", "", t) not in joined]
        if missing:
            fail("② 文本存在性", f"{label} 缺失 {len(missing)} 条：{missing[:3]}")
        else:
            emit(True, "② 文本存在性", f"{label} 全部 {len(exp_texts)} 条可见")

        # ③ 文本去重：pptx 中出现次数不得超过 deck 期望次数
        dups = []
        for t, n in exp_texts.items():
            got = text_counts.get(t, 0)
            if got > n:
                dups.append(f"{t[:14]}…×{got}(期望{n})" if len(t) > 14 else f"{t}×{got}(期望{n})")
        if dups:
            fail("③ 文本去重", f"{label} 重复：{dups[:4]}")
        else:
            emit(True, "③ 文本去重", label)

        # ④ 图片数量：光栅化配额
        if pictures > exp_imgs + PICTURE_ALLOWANCE:
            fail("④ 图片数量", f"{label} {pictures} 张图片（deck img {exp_imgs} + 配额 {PICTURE_ALLOWANCE}）——疑似复杂元素被整块光栅化")
        else:
            emit(True, "④ 图片数量", f"{label} {pictures} 张（额度内）")

        # ⑥ 遮挡启发式（仅 --full）：整页大面积盖顶 + 中型形状盖字群
        if mode == "--full":
            try:
                area_total = prs.slide_width * prs.slide_height
                covers = []
                text_centers = []
                for z, sh in enumerate(shapes):
                    if sh.left is None or sh.width is None:
                        continue
                    if getattr(sh, "has_text_frame", False) and sh.has_text_frame and sh.text_frame.text.strip():
                        cx = sh.left + sh.width / 2
                        cy = sh.top + sh.height / 2
                        if sh.height < area_total / 80:      # 文字形状（矮）
                            text_centers.append((cx, cy, sh.text_frame.text.strip()[:12] or sh.name, z))
                    if z < Z_FLOOR:
                        continue
                    st = str(sh.shape_type)
                    if "PICTURE" not in st and "AUTO_SHAPE" not in st:
                        continue
                    try:
                        fill = sh.fill.type
                    except Exception:
                        fill = None
                    if fill is None:
                        continue
                    if sh.width * sh.height >= area_total * SLIDE_AREA_TOLERANCE:
                        covers.append(f"{sh.name}@z{z} 整页级")
                for z, sh in enumerate(shapes):
                    if z < Z_FLOOR or sh.left is None or sh.width is None:
                        continue
                    st = str(sh.shape_type)
                    if "PICTURE" not in st and "AUTO_SHAPE" not in st:
                        continue
                    if sh.width * sh.height >= area_total * SLIDE_AREA_TOLERANCE:
                        continue
                    if sh.width * sh.height < area_total * 0.08:
                        continue
                    L, T = sh.left, sh.top
                    R, B = L + sh.width, T + sh.height
                    inside = [nm for (cx, cy, nm, zt) in text_centers
                              if L <= cx <= R and T <= cy <= B and zt < z]   # 文字在下、大形状在上才算盖
                    if len(inside) >= COVER_TEXT_MIN:
                        covers.append(f"{sh.name}@z{z} 盖住{len(inside)}条文字(如『{inside[0]}』)")
                if covers:
                    fail("⑥ 遮挡启发式", f"{label} 疑似内容被盖住：{covers[:3]}")
                else:
                    emit(True, "⑥ 遮挡启发式", label)
            except Exception as exc:  # 启发式失败不阻塞其余断言
                emit(False, "⑥ 遮挡启发式", f"启发式异常：{exc}", True)
                fails += 1

    if fails:
        print(json.dumps({"ok": False, "name": "export_assert", "detail": f"{fails} 项失败"}, ensure_ascii=False))
        sys.exit(1)
    print(json.dumps({"ok": True, "name": "export_assert", "detail": "全部断言通过"}, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
