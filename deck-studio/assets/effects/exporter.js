/* =====================================================================
   deck-studio 效果基建 · exporter.js — 一键导出 PPTX（唯一源）
   ---------------------------------------------------------------------
   deck 内 ═══ DECK ENGINE ═══ 标记块的一部分（sync-engine 写入）。
   页面有 #pptxBtn 按钮时自动绑定：点击后浏览器本地把每页渲染为高清图
   （SVG foreignObject + Canvas），按 build_pptx 同构的 OOXML 现场组装
   16:9 PPTX 并下载。零服务器、零外部依赖（zip 为 store 模式手写实现）。
   快照语义（宪法 2）：每页 = 最终态，不含动画元素与播放器杂物。
   限制：webfont 在导出图中回退系统字体（本地 convert.py 管线无此限制）；
   editable（可编辑文字）导出不在本模块范围。
   ===================================================================== */
window.DeckExport = (function () {
    const W = 1920, H = 1080, SCALE = 2, QUALITY = 0.92;
    const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
    const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const WIDTH = 12192000, HEIGHT = 6858000;                       // EMU，精确 16:9
    const TPL_MASTER = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<!-- \u7a7a\u767d\u6bcd\u7248\u3001\u7248\u5f0f\u4e0e\u4e3b\u9898\u53d6\u81ea python-pptx 1.0.2 \u7684\u9ed8\u8ba4\u6709\u6548\u6587\u7a3f\uff1b\u6bcd\u7248\u53ea\u4fdd\u7559\u7a7a\u767d\u7248\u5f0f\u3002 -->\n<p:sldMaster xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:ns2=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><p:cSld><p:bg><p:bgRef idx=\"1001\"><a:schemeClr val=\"bg1\" /></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\" /><p:cNvGrpSpPr /><p:nvPr /></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\" /><a:ext cx=\"0\" cy=\"0\" /><a:chOff x=\"0\" y=\"0\" /><a:chExt cx=\"0\" cy=\"0\" /></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Title Placeholder 1\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"title\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"274638\" /><a:ext cx=\"8229600\" cy=\"1143000\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\"><a:normAutofit /></a:bodyPr><a:lstStyle /><a:p><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Click to edit Master title style</a:t></a:r><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Text Placeholder 2\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"body\" idx=\"1\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"1600200\" /><a:ext cx=\"8229600\" cy=\"4525963\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\"><a:normAutofit /></a:bodyPr><a:lstStyle /><a:p><a:pPr lvl=\"0\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Click to edit Master text styles</a:t></a:r></a:p><a:p><a:pPr lvl=\"1\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Second level</a:t></a:r></a:p><a:p><a:pPr lvl=\"2\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Third level</a:t></a:r></a:p><a:p><a:pPr lvl=\"3\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Fourth level</a:t></a:r></a:p><a:p><a:pPr lvl=\"4\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Fifth level</a:t></a:r><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Date Placeholder 3\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"dt\" sz=\"half\" idx=\"2\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"6356350\" /><a:ext cx=\"2133600\" cy=\"365125\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\" /><a:lstStyle><a:lvl1pPr algn=\"l\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\" /></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:fld id=\"{5BCAD085-E8A6-8845-BD4E-CB4CCA059FC4}\" type=\"datetimeFigureOut\"><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>1/27/13</a:t></a:fld><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"5\" name=\"Footer Placeholder 4\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"ftr\" sz=\"quarter\" idx=\"3\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"3124200\" y=\"6356350\" /><a:ext cx=\"2895600\" cy=\"365125\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\" /><a:lstStyle><a:lvl1pPr algn=\"ctr\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\" /></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"6\" name=\"Slide Number Placeholder 5\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"sldNum\" sz=\"quarter\" idx=\"4\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"6553200\" y=\"6356350\" /><a:ext cx=\"2133600\" cy=\"365125\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\" /><a:lstStyle><a:lvl1pPr algn=\"r\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\" /></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:fld id=\"{C1FF6DA9-008F-8B48-92A6-B652298478BF}\" type=\"slidenum\"><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>\u2039#\u203a</a:t></a:fld><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp></p:spTree><p:extLst><p:ext uri=\"{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}\"><ns2:creationId val=\"2209977519\" /></p:ext></p:extLst></p:cSld><p:clrMap bg1=\"lt1\" tx1=\"dk1\" bg2=\"lt2\" tx2=\"dk2\" accent1=\"accent1\" accent2=\"accent2\" accent3=\"accent3\" accent4=\"accent4\" accent5=\"accent5\" accent6=\"accent6\" hlink=\"hlink\" folHlink=\"folHlink\" /><p:sldLayoutIdLst><p:sldLayoutId id=\"2147483655\" r:id=\"rId1\" /></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn=\"ctr\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"0\" /></a:spcBef><a:buNone /><a:defRPr sz=\"4400\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mj-lt\" /><a:ea typeface=\"+mj-ea\" /><a:cs typeface=\"+mj-cs\" /></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL=\"342900\" indent=\"-342900\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"3200\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl1pPr><a:lvl2pPr marL=\"742950\" indent=\"-285750\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2013\" /><a:defRPr sz=\"2800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl2pPr><a:lvl3pPr marL=\"1143000\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2400\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl3pPr><a:lvl4pPr marL=\"1600200\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2013\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl4pPr><a:lvl5pPr marL=\"2057400\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u00bb\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl5pPr><a:lvl6pPr marL=\"2514600\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl6pPr><a:lvl7pPr marL=\"2971800\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl7pPr><a:lvl8pPr marL=\"3429000\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl8pPr><a:lvl9pPr marL=\"3886200\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl9pPr></p:bodyStyle><p:otherStyle><a:defPPr><a:defRPr lang=\"en-US\" /></a:defPPr><a:lvl1pPr marL=\"0\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl1pPr><a:lvl2pPr marL=\"457200\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl2pPr><a:lvl3pPr marL=\"914400\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl3pPr><a:lvl4pPr marL=\"1371600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl4pPr><a:lvl5pPr marL=\"1828800\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl5pPr><a:lvl6pPr marL=\"2286000\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl6pPr><a:lvl7pPr marL=\"2743200\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl7pPr><a:lvl8pPr marL=\"3200400\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl8pPr><a:lvl9pPr marL=\"3657600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl9pPr></p:otherStyle></p:txStyles></p:sldMaster>\n";
    const TPL_LAYOUT = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<!-- \u7a7a\u767d\u6bcd\u7248\u3001\u7248\u5f0f\u4e0e\u4e3b\u9898\u53d6\u81ea python-pptx 1.0.2 \u7684\u9ed8\u8ba4\u6709\u6548\u6587\u7a3f\uff1b\u6bcd\u7248\u53ea\u4fdd\u7559\u7a7a\u767d\u7248\u5f0f\u3002 -->\n<p:sldLayout xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" type=\"blank\" preserve=\"1\"><p:cSld name=\"Blank\"><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/><a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Date Placeholder 1\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"dt\" sz=\"half\" idx=\"10\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id=\"{5BCAD085-E8A6-8845-BD4E-CB4CCA059FC4}\" type=\"datetimeFigureOut\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>1/27/13</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Footer Placeholder 2\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"ftr\" sz=\"quarter\" idx=\"11\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Slide Number Placeholder 3\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"sldNum\" sz=\"quarter\" idx=\"12\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id=\"{C1FF6DA9-008F-8B48-92A6-B652298478BF}\" type=\"slidenum\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>\u2039#\u203a</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp></p:spTree><p:extLst><p:ext uri=\"{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}\"><p14:creationId xmlns:p14=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" val=\"1212999818\"/></p:ext></p:extLst></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>\n";
    const TPL_THEME = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<!-- \u7a7a\u767d\u6bcd\u7248\u3001\u7248\u5f0f\u4e0e\u4e3b\u9898\u53d6\u81ea python-pptx 1.0.2 \u7684\u9ed8\u8ba4\u6709\u6548\u6587\u7a3f\uff1b\u6bcd\u7248\u53ea\u4fdd\u7559\u7a7a\u767d\u7248\u5f0f\u3002 -->\n<a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Office Theme\"><a:themeElements><a:clrScheme name=\"Office\"><a:dk1><a:sysClr val=\"windowText\" lastClr=\"000000\"/></a:dk1><a:lt1><a:sysClr val=\"window\" lastClr=\"FFFFFF\"/></a:lt1><a:dk2><a:srgbClr val=\"1F497D\"/></a:dk2><a:lt2><a:srgbClr val=\"EEECE1\"/></a:lt2><a:accent1><a:srgbClr val=\"4F81BD\"/></a:accent1><a:accent2><a:srgbClr val=\"C0504D\"/></a:accent2><a:accent3><a:srgbClr val=\"9BBB59\"/></a:accent3><a:accent4><a:srgbClr val=\"8064A2\"/></a:accent4><a:accent5><a:srgbClr val=\"4BACC6\"/></a:accent5><a:accent6><a:srgbClr val=\"F79646\"/></a:accent6><a:hlink><a:srgbClr val=\"0000FF\"/></a:hlink><a:folHlink><a:srgbClr val=\"800080\"/></a:folHlink></a:clrScheme><a:fontScheme name=\"Office\"><a:majorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"\uff2d\uff33 \uff30\u30b4\u30b7\u30c3\u30af\"/><a:font script=\"Hang\" typeface=\"\ub9d1\uc740 \uace0\ub515\"/><a:font script=\"Hans\" typeface=\"\u5b8b\u4f53\"/><a:font script=\"Hant\" typeface=\"\u65b0\u7d30\u660e\u9ad4\"/><a:font script=\"Arab\" typeface=\"Times New Roman\"/><a:font script=\"Hebr\" typeface=\"Times New Roman\"/><a:font script=\"Thai\" typeface=\"Angsana New\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"MoolBoran\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Times New Roman\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:majorFont><a:minorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"\uff2d\uff33 \uff30\u30b4\u30b7\u30c3\u30af\"/><a:font script=\"Hang\" typeface=\"\ub9d1\uc740 \uace0\ub515\"/><a:font script=\"Hans\" typeface=\"\u5b8b\u4f53\"/><a:font script=\"Hant\" typeface=\"\u65b0\u7d30\u660e\u9ad4\"/><a:font script=\"Arab\" typeface=\"Arial\"/><a:font script=\"Hebr\" typeface=\"Arial\"/><a:font script=\"Thai\" typeface=\"Cordia New\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"DaunPenh\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Arial\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:minorFont></a:fontScheme><a:fmtScheme name=\"Office\"><a:fillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"35000\"><a:schemeClr val=\"phClr\"><a:tint val=\"37000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"15000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"1\"/></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"100000\"/><a:shade val=\"100000\"/><a:satMod val=\"130000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:shade val=\"100000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"0\"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w=\"9525\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"><a:shade val=\"95000\"/><a:satMod val=\"105000\"/></a:schemeClr></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"25400\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"38100\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"20000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"38000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst><a:scene3d><a:camera prst=\"orthographicFront\"><a:rot lat=\"0\" lon=\"0\" rev=\"0\"/></a:camera><a:lightRig rig=\"threePt\" dir=\"t\"><a:rot lat=\"0\" lon=\"0\" rev=\"1200000\"/></a:lightRig></a:scene3d><a:sp3d><a:bevelT w=\"63500\" h=\"25400\"/></a:sp3d></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"40000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"40000\"><a:schemeClr val=\"phClr\"><a:tint val=\"45000\"/><a:shade val=\"99000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"20000\"/><a:satMod val=\"255000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"-80000\" r=\"50000\" b=\"180000\"/></a:path></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"80000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"30000\"/><a:satMod val=\"200000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"50000\" r=\"50000\" b=\"50000\"/></a:path></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults><a:spDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"3\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"lt1\"/></a:fontRef></a:style></a:spDef><a:lnDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"0\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"tx1\"/></a:fontRef></a:style></a:lnDef></a:objectDefaults><a:extraClrSchemeLst/></a:theme>\n";
    const xml = body => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + body;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const relationships = items => xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + items.map(([id, kind, target]) => `<Relationship Id="rId${id}" Type="${R}/${kind}" Target="${esc(target)}"/>`).join('') + '</Relationships>');
    const picture = (id, name, rel) =>
        `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>`
        + `<p:blipFill><a:blip r:embed="rId${rel}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
        + `<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${WIDTH}" cy="${HEIGHT}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
    const slideXml = name => xml(
        `<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree>`
        + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
        + picture(2, name, 2)
        + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>');
    const contentTypes = n => xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>'
        + '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
        + '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
        + '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
        + '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
        + Array.from({ length: n }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')
        + '</Types>');

    /* —— store 模式 zip（PPTX 不要求压缩；JPEG 本身已压缩） —— */
    const CRC_TABLE = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
        return t;
    })();
    function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
    function zipStore(files) {
        const enc = new TextEncoder(), parts = [], central = [];
        let offset = 0;
        const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
        const DOS_TIME = 12 << 11, DOS_DATE = ((2026 - 1980) << 9) | (9 << 5) | 24;
        for (const f of files) {
            const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
            const nameB = enc.encode(f.name), crc = crc32(data);
            const local = new Uint8Array(30 + nameB.length);
            local.set([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0)]);
            local.set(nameB, 30);
            parts.push(local, data);
            central.push({ nameB, crc, size: data.length, offset });
            offset += local.length + data.length;
        }
        const cdStart = offset;
        for (const c of central) {
            const cd = new Uint8Array(46 + c.nameB.length);
            cd.set([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE), ...u32(c.crc), ...u32(c.size), ...u32(c.size), ...u16(c.nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)]);
            cd.set(c.nameB, 46);
            parts.push(cd);
            offset += cd.length;
        }
        const end = new Uint8Array(22);
        end.set([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(offset - cdStart), ...u32(cdStart), ...u16(0)]);
        parts.push(end);
        const out = new Uint8Array(offset + 22);
        let pos = 0;
        for (const c of parts) { out.set(c, pos); pos += c.length; }
        return out;
    }

    /* —— 单页渲染：foreignObject + Canvas（系统字体；webfont 回退为已知限制） —— */
    const EXPORT_CSS = `
        section.slide{visibility:visible!important;opacity:1!important;position:relative!important;inset:auto!important;
            margin:0!important;border-radius:0!important;box-shadow:none!important;width:1920px!important;height:1080px!important}
        .slide .reveal{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
        .fx-layer,.ambient-layer{display:none!important}
        *{animation:none!important;transition:none!important}`;
    function slideImage(slide, deckCss) {
        const clone = slide.cloneNode(true);
        clone.querySelectorAll('.fx-layer,.ambient-layer').forEach(n => n.remove());
        clone.querySelectorAll('.reveal').forEach(n => n.classList.add('shown'));
        const wrap = document.createElement('div');
        wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        const style = document.createElement('style');
        style.textContent = deckCss + '\n' + EXPORT_CSS;
        wrap.appendChild(style);
        wrap.appendChild(clone);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', W); svg.setAttribute('height', H);
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('width', '100%'); fo.setAttribute('height', '100%');
        fo.appendChild(wrap);
        svg.appendChild(fo);
        return new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = W * SCALE; canvas.height = H * SCALE;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(b => b ? res(b) : rej(new Error('canvas.toBlob 失败')), 'image/jpeg', QUALITY);
            };
            img.onerror = () => rej(new Error('页渲染失败（foreignObject 光栅化）'));
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
        });
    }

    async function exportPptx(deck) {
        const slides = deck.slides;
        const deckCss = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
        const hint = t => deck.flashHint('playerHint', t, 2500);
        const files = [];
        const images = [];
        for (let i = 0; i < slides.length; i++) {
            hint(`导出 PPTX ${i + 1}/${slides.length}…`);
            const blob = await slideImage(slides[i], deckCss);
            const u8 = new Uint8Array(await blob.arrayBuffer());
            const name = `image${i + 1}.jpg`;
            images.push(name); files.push({ name: `ppt/media/${name}`, data: u8 });
        }
        hint('组装 PPTX…');
        files.push({ name: '[Content_Types].xml', data: contentTypes(slides.length) });
        files.push({ name: '_rels/.rels', data: relationships([[1, 'officeDocument', 'ppt/presentation.xml']]) });
        const slideIds = Array.from({ length: slides.length }, (_, i) => `<p:sldId id="${255 + i + 1}" r:id="rId${i + 2}"/>`).join('');
        files.push({ name: 'ppt/presentation.xml', data: xml(
            `<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" autoCompressPictures="0">`
            + '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
            + `<p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${WIDTH}" cy="${HEIGHT}"/>`
            + '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>') });
        files.push({ name: 'ppt/_rels/presentation.xml.rels', data: relationships(
            [[1, 'slideMaster', 'slideMasters/slideMaster1.xml']]
            .concat(Array.from({ length: slides.length }, (_, i) => [i + 2, 'slide', `slides/slide${i + 1}.xml`]))) });
        files.push({ name: 'ppt/slideMasters/slideMaster1.xml', data: TPL_MASTER });
        files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relationships([[1, 'slideLayout', '../slideLayouts/slideLayout1.xml'], [2, 'theme', '../theme/theme1.xml']]) });
        files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', data: TPL_LAYOUT });
        files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relationships([[1, 'slideMaster', '../slideMasters/slideMaster1.xml']]) });
        files.push({ name: 'ppt/theme/theme1.xml', data: TPL_THEME });
        for (let i = 0; i < slides.length; i++) {
            files.push({ name: `ppt/slides/slide${i + 1}.xml`, data: slideXml(images[i]) });
            files.push({ name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: relationships([[1, 'slideLayout', '../slideLayouts/slideLayout1.xml'], [2, 'image', `../media/${images[i]}`]]) });
        }
        const blob = new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (document.title || 'deck') + '.pptx';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        hint('PPTX 已下载 ✓（快照版：每页一张最终态图）');
    }

    function bind(deck) {
        const btn = document.getElementById('pptxBtn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            if (btn.dataset.busy) return;
            btn.dataset.busy = '1'; btn.textContent = '⤓ 导出中…';
            try { await exportPptx(deck); } catch (e) { deck.flashHint('playerHint', '导出失败：' + e.message, 4000); }
            delete btn.dataset.busy; btn.textContent = '⤓ PPT';
        });
    }
    return { exportPptx, bind };
})();
(function () {
    const boot = () => { if (window.__deck && window.DeckExport) window.DeckExport.bind(window.__deck); };
    if (window.__deck) boot(); else addEventListener('load', boot, { once: true });
})();
