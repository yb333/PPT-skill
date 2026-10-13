/* =====================================================================
   deck-studio 效果基建 · exporter.js — PPTX 导出（唯一源，engine 1.5.0 双模式）
   ---------------------------------------------------------------------
   deck 内 ═══ DECK ENGINE ═══ 标记块的一部分（sync-engine 写入）。
   ⤓ PPT  → 可编辑 PPTX：页内提取文本/形状/连接线/自由曲线/表格为原生对象，
             图表每框每线每字可直接编辑（与 CLI --mode editable 同构）
   ⤓ 图   → 快照 PPTX：每页 2× 高清 JPEG 满屏（放映/分享用，像素级保真）
   零服务器、零外部依赖（zip 为 store 模式手写实现）；file:// 离线可用。
   限制：webfont 导出回退系统字体（高保真批量走 convert.py 管线）。
   ===================================================================== */
window.DeckExport = (function () {
    const W = 1920, H = 1080, SCALE = 2, QUALITY = 0.92;
    const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
    const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const WIDTH = 12192000, HEIGHT = 6858000;                       // EMU，精确 16:9
    const SX = WIDTH / W, SY = HEIGHT / H;                          // 6350 EMU/px
    const TPL_MASTER = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<!-- \u7a7a\u767d\u6bcd\u7248\u3001\u7248\u5f0f\u4e0e\u4e3b\u9898\u53d6\u81ea python-pptx 1.0.2 \u7684\u9ed8\u8ba4\u6709\u6548\u6587\u7a3f\uff1b\u6bcd\u7248\u53ea\u4fdd\u7559\u7a7a\u767d\u7248\u5f0f\u3002 -->\n<p:sldMaster xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:ns2=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><p:cSld><p:bg><p:bgRef idx=\"1001\"><a:schemeClr val=\"bg1\" /></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\" /><p:cNvGrpSpPr /><p:nvPr /></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\" /><a:ext cx=\"0\" cy=\"0\" /><a:chOff x=\"0\" y=\"0\" /><a:chExt cx=\"0\" cy=\"0\" /></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Title Placeholder 1\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"title\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"274638\" /><a:ext cx=\"8229600\" cy=\"1143000\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\"><a:normAutofit /></a:bodyPr><a:lstStyle /><a:p><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Click to edit Master title style</a:t></a:r><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Text Placeholder 2\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"body\" idx=\"1\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"1600200\" /><a:ext cx=\"8229600\" cy=\"4525963\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\"><a:normAutofit /></a:bodyPr><a:lstStyle /><a:p><a:pPr lvl=\"0\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Click to edit Master text styles</a:t></a:r></a:p><a:p><a:pPr lvl=\"1\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Second level</a:t></a:r></a:p><a:p><a:pPr lvl=\"2\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Third level</a:t></a:r></a:p><a:p><a:pPr lvl=\"3\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Fourth level</a:t></a:r></a:p><a:p><a:pPr lvl=\"4\" /><a:r><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>Fifth level</a:t></a:r><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Date Placeholder 3\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"dt\" sz=\"half\" idx=\"2\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"457200\" y=\"6356350\" /><a:ext cx=\"2133600\" cy=\"365125\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\" /><a:lstStyle><a:lvl1pPr algn=\"l\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\" /></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:fld id=\"{5BCAD085-E8A6-8845-BD4E-CB4CCA059FC4}\" type=\"datetimeFigureOut\"><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>1/27/13</a:t></a:fld><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"5\" name=\"Footer Placeholder 4\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"ftr\" sz=\"quarter\" idx=\"3\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"3124200\" y=\"6356350\" /><a:ext cx=\"2895600\" cy=\"365125\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\" /><a:lstStyle><a:lvl1pPr algn=\"ctr\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\" /></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"6\" name=\"Slide Number Placeholder 5\" /><p:cNvSpPr><a:spLocks noGrp=\"1\" /></p:cNvSpPr><p:nvPr><p:ph type=\"sldNum\" sz=\"quarter\" idx=\"4\" /></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x=\"6553200\" y=\"6356350\" /><a:ext cx=\"2133600\" cy=\"365125\" /></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst /></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert=\"horz\" lIns=\"91440\" tIns=\"45720\" rIns=\"91440\" bIns=\"45720\" rtlCol=\"0\" anchor=\"ctr\" /><a:lstStyle><a:lvl1pPr algn=\"r\"><a:defRPr sz=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\"><a:tint val=\"75000\" /></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle><a:p><a:fld id=\"{C1FF6DA9-008F-8B48-92A6-B652298478BF}\" type=\"slidenum\"><a:rPr lang=\"en-US\" smtClean=\"0\" /><a:t>\u2039#\u203a</a:t></a:fld><a:endParaRPr lang=\"en-US\" /></a:p></p:txBody></p:sp></p:spTree><p:extLst><p:ext uri=\"{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}\"><ns2:creationId val=\"2209977519\" /></p:ext></p:extLst></p:cSld><p:clrMap bg1=\"lt1\" tx1=\"dk1\" bg2=\"lt2\" tx2=\"dk2\" accent1=\"accent1\" accent2=\"accent2\" accent3=\"accent3\" accent4=\"accent4\" accent5=\"accent5\" accent6=\"accent6\" hlink=\"hlink\" folHlink=\"folHlink\" /><p:sldLayoutIdLst><p:sldLayoutId id=\"2147483655\" r:id=\"rId1\" /></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn=\"ctr\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"0\" /></a:spcBef><a:buNone /><a:defRPr sz=\"4400\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mj-lt\" /><a:ea typeface=\"+mj-ea\" /><a:cs typeface=\"+mj-cs\" /></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL=\"342900\" indent=\"-342900\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"3200\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl1pPr><a:lvl2pPr marL=\"742950\" indent=\"-285750\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2013\" /><a:defRPr sz=\"2800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl2pPr><a:lvl3pPr marL=\"1143000\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2400\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl3pPr><a:lvl4pPr marL=\"1600200\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2013\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl4pPr><a:lvl5pPr marL=\"2057400\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u00bb\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl5pPr><a:lvl6pPr marL=\"2514600\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl6pPr><a:lvl7pPr marL=\"2971800\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl7pPr><a:lvl8pPr marL=\"3429000\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl8pPr><a:lvl9pPr marL=\"3886200\" indent=\"-228600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:spcBef><a:spcPct val=\"20000\" /></a:spcBef><a:buFont typeface=\"Arial\" /><a:buChar char=\"\u2022\" /><a:defRPr sz=\"2000\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl9pPr></p:bodyStyle><p:otherStyle><a:defPPr><a:defRPr lang=\"en-US\" /></a:defPPr><a:lvl1pPr marL=\"0\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl1pPr><a:lvl2pPr marL=\"457200\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl2pPr><a:lvl3pPr marL=\"914400\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl3pPr><a:lvl4pPr marL=\"1371600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl4pPr><a:lvl5pPr marL=\"1828800\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl5pPr><a:lvl6pPr marL=\"2286000\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl6pPr><a:lvl7pPr marL=\"2743200\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl7pPr><a:lvl8pPr marL=\"3200400\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl8pPr><a:lvl9pPr marL=\"3657600\" algn=\"l\" defTabSz=\"457200\" rtl=\"0\" eaLnBrk=\"1\" latinLnBrk=\"0\" hangingPunct=\"1\"><a:defRPr sz=\"1800\" kern=\"1200\"><a:solidFill><a:schemeClr val=\"tx1\" /></a:solidFill><a:latin typeface=\"+mn-lt\" /><a:ea typeface=\"+mn-ea\" /><a:cs typeface=\"+mn-cs\" /></a:defRPr></a:lvl9pPr></p:otherStyle></p:txStyles></p:sldMaster>\n";
    const TPL_LAYOUT = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<!-- \u7a7a\u767d\u6bcd\u7248\u3001\u7248\u5f0f\u4e0e\u4e3b\u9898\u53d6\u81ea python-pptx 1.0.2 \u7684\u9ed8\u8ba4\u6709\u6548\u6587\u7a3f\uff1b\u6bcd\u7248\u53ea\u4fdd\u7559\u7a7a\u767d\u7248\u5f0f\u3002 -->\n<p:sldLayout xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" type=\"blank\" preserve=\"1\"><p:cSld name=\"Blank\"><p:spTree><p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/><a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Date Placeholder 1\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"dt\" sz=\"half\" idx=\"10\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id=\"{5BCAD085-E8A6-8845-BD4E-CB4CCA059FC4}\" type=\"datetimeFigureOut\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>1/27/13</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Footer Placeholder 2\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"ftr\" sz=\"quarter\" idx=\"11\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id=\"4\" name=\"Slide Number Placeholder 3\"/><p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr><p:nvPr><p:ph type=\"sldNum\" sz=\"quarter\" idx=\"12\"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id=\"{C1FF6DA9-008F-8B48-92A6-B652298478BF}\" type=\"slidenum\"><a:rPr lang=\"en-US\" smtClean=\"0\"/><a:t>\u2039#\u203a</a:t></a:fld><a:endParaRPr lang=\"en-US\"/></a:p></p:txBody></p:sp></p:spTree><p:extLst><p:ext uri=\"{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}\"><p14:creationId xmlns:p14=\"http://schemas.microsoft.com/office/powerpoint/2010/main\" val=\"1212999818\"/></p:ext></p:extLst></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>\n";
    const TPL_THEME = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<!-- \u7a7a\u767d\u6bcd\u7248\u3001\u7248\u5f0f\u4e0e\u4e3b\u9898\u53d6\u81ea python-pptx 1.0.2 \u7684\u9ed8\u8ba4\u6709\u6548\u6587\u7a3f\uff1b\u6bcd\u7248\u53ea\u4fdd\u7559\u7a7a\u767d\u7248\u5f0f\u3002 -->\n<a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Office Theme\"><a:themeElements><a:clrScheme name=\"Office\"><a:dk1><a:sysClr val=\"windowText\" lastClr=\"000000\"/></a:dk1><a:lt1><a:sysClr val=\"window\" lastClr=\"FFFFFF\"/></a:lt1><a:dk2><a:srgbClr val=\"1F497D\"/></a:dk2><a:lt2><a:srgbClr val=\"EEECE1\"/></a:lt2><a:accent1><a:srgbClr val=\"4F81BD\"/></a:accent1><a:accent2><a:srgbClr val=\"C0504D\"/></a:accent2><a:accent3><a:srgbClr val=\"9BBB59\"/></a:accent3><a:accent4><a:srgbClr val=\"8064A2\"/></a:accent4><a:accent5><a:srgbClr val=\"4BACC6\"/></a:accent5><a:accent6><a:srgbClr val=\"F79646\"/></a:accent6><a:hlink><a:srgbClr val=\"0000FF\"/></a:hlink><a:folHlink><a:srgbClr val=\"800080\"/></a:folHlink></a:clrScheme><a:fontScheme name=\"Office\"><a:majorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"\uff2d\uff33 \uff30\u30b4\u30b7\u30c3\u30af\"/><a:font script=\"Hang\" typeface=\"\ub9d1\uc740 \uace0\ub515\"/><a:font script=\"Hans\" typeface=\"\u5b8b\u4f53\"/><a:font script=\"Hant\" typeface=\"\u65b0\u7d30\u660e\u9ad4\"/><a:font script=\"Arab\" typeface=\"Times New Roman\"/><a:font script=\"Hebr\" typeface=\"Times New Roman\"/><a:font script=\"Thai\" typeface=\"Angsana New\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"MoolBoran\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Times New Roman\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:majorFont><a:minorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"\uff2d\uff33 \uff30\u30b4\u30b7\u30c3\u30af\"/><a:font script=\"Hang\" typeface=\"\ub9d1\uc740 \uace0\ub515\"/><a:font script=\"Hans\" typeface=\"\u5b8b\u4f53\"/><a:font script=\"Hant\" typeface=\"\u65b0\u7d30\u660e\u9ad4\"/><a:font script=\"Arab\" typeface=\"Arial\"/><a:font script=\"Hebr\" typeface=\"Arial\"/><a:font script=\"Thai\" typeface=\"Cordia New\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"DaunPenh\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Arial\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:minorFont></a:fontScheme><a:fmtScheme name=\"Office\"><a:fillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"35000\"><a:schemeClr val=\"phClr\"><a:tint val=\"37000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"15000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"1\"/></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"100000\"/><a:shade val=\"100000\"/><a:satMod val=\"130000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:shade val=\"100000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"0\"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w=\"9525\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"><a:shade val=\"95000\"/><a:satMod val=\"105000\"/></a:schemeClr></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"25400\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"38100\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"20000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"38000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst><a:scene3d><a:camera prst=\"orthographicFront\"><a:rot lat=\"0\" lon=\"0\" rev=\"0\"/></a:camera><a:lightRig rig=\"threePt\" dir=\"t\"><a:rot lat=\"0\" lon=\"0\" rev=\"1200000\"/></a:lightRig></a:scene3d><a:sp3d><a:bevelT w=\"63500\" h=\"25400\"/></a:sp3d></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"40000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"40000\"><a:schemeClr val=\"phClr\"><a:tint val=\"45000\"/><a:shade val=\"99000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"20000\"/><a:satMod val=\"255000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"-80000\" r=\"50000\" b=\"180000\"/></a:path></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"80000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"30000\"/><a:satMod val=\"200000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"50000\" r=\"50000\" b=\"50000\"/></a:path></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults><a:spDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"3\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"lt1\"/></a:fontRef></a:style></a:spDef><a:lnDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"0\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"tx1\"/></a:fontRef></a:style></a:lnDef></a:objectDefaults><a:extraClrSchemeLst/></a:theme>\n";
    const xml = body => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + body;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const relationships = items => xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + items.map(([id, kind, target]) => `<Relationship Id="rId${id}" Type="${R}/${kind}" Target="${esc(target)}"/>`).join('') + '</Relationships>');
    const picture = (id, name, rel, left = 0, top = 0, width = WIDTH, height = HEIGHT) =>
        `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>`
        + `<p:blipFill><a:blip r:embed="rId${rel}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
        + `<p:spPr><a:xfrm><a:off x="${left}" y="${top}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
    const solidFill = (hex, opacity = 1) => hex
        ? `<a:solidFill><a:srgbClr val="${hex}">${opacity < 1 ? `<a:alpha val="${Math.round(opacity * 100000)}"/>` : ''}</a:srgbClr></a:solidFill>` : '<a:noFill/>';
    const contentTypesImage = n => xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>'
        + '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
        + '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
        + '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
        + '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
        + Array.from({ length: n }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')
        + '</Types>');

    /* —— store zip —— */
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

    /* —— 快照模式：整页 foreignObject 光栅化 —— */
    const SNAPSHOT_CSS = `
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
        style.textContent = deckCss + '\n' + SNAPSHOT_CSS;
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
    async function exportSnapshot(deck) {
        const deckCss = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
        const files = [];
        for (let i = 0; i < deck.slides.length; i++) {
            deck.flashHint('playerHint', `导出快照 ${i + 1}/${deck.slides.length}…`, 2000);
            const blob = await slideImage(deck.slides[i], deckCss);
            files.push({ name: `ppt/media/image${i + 1}.jpg`, data: new Uint8Array(await blob.arrayBuffer()) });
        }
        files.push({ name: '[Content_Types].xml', data: contentTypesImage(deck.slides.length) });
        files.push({ name: '_rels/.rels', data: relationships([[1, 'officeDocument', 'ppt/presentation.xml']]) });
        const slideIds = Array.from({ length: deck.slides.length }, (_, i) => `<p:sldId id="${255 + i + 1}" r:id="rId${i + 2}"/>`).join('');
        files.push({ name: 'ppt/presentation.xml', data: xml(
            `<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" autoCompressPictures="0">`
            + '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
            + `<p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${WIDTH}" cy="${HEIGHT}"/>`
            + '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>') });
        files.push({ name: 'ppt/_rels/presentation.xml.rels', data: relationships(
            [[1, 'slideMaster', 'slideMasters/slideMaster1.xml']]
            .concat(Array.from({ length: deck.slides.length }, (_, i) => [i + 2, 'slide', `slides/slide${i + 1}.xml`]))) });
        files.push({ name: 'ppt/slideMasters/slideMaster1.xml', data: TPL_MASTER });
        files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relationships([[1, 'slideLayout', '../slideLayouts/slideLayout1.xml'], [2, 'theme', '../theme/theme1.xml']]) });
        files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', data: TPL_LAYOUT });
        files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relationships([[1, 'slideMaster', '../slideMasters/slideMaster1.xml']]) });
        files.push({ name: 'ppt/theme/theme1.xml', data: TPL_THEME });
        for (let i = 0; i < deck.slides.length; i++) {
            files.push({ name: `ppt/slides/slide${i + 1}.xml`, data: slideXml(`image${i + 1}.jpg`) });
            files.push({ name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: relationships([[1, 'slideLayout', '../slideLayouts/slideLayout1.xml'], [2, 'image', `../media/image${i + 1}.jpg`]]) });
        }
        downloadPptx(zipStore(files), deck, 'PPTX 快照已下载 ✓');
    }
    const pictureXml = picture;
    const slideXml = name => xml(
        `<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree>`
        + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
        + picture(2, name, 2)
        + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>');
    function downloadPptx(u8, deck, message) {
        const blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (document.title || 'deck') + '.pptx';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        deck.flashHint('playerHint', message, 3000);
    }

    /* ═══ COLLECTOR:BEGIN — 自 scripts/html2pptx/editable-scene.mjs 同步，勿手改（改收集器→两处源→sync） ═══ */
function collectEditableScene(slideIndex) {
  const canvas = document.querySelectorAll('section.slide')[slideIndex];   // deck-studio 契约
  const bounds = canvas.getBoundingClientRect();
  const sx = 1920 / bounds.width, sy = 1080 / bounds.height;
  const fontScale = 1920 / canvas.offsetWidth;
  const elements = [], warnings = new Set(), targets = [], paint = [];
  const order = new Map([canvas, ...canvas.querySelectorAll('*')].map((el, index) => [el, index]));
  const box = rect => ({ x: (rect.left - bounds.left) * sx, y: (rect.top - bounds.top) * sy, width: rect.width * sx, height: rect.height * sy });
  const visibleRect = rect => rect.width > 0 && rect.height > 0 && rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom;
  function color(value) {
    const parts = value?.match(/[\d.]+/g)?.map(Number);
    if (!parts || parts.length < 3) return { hex: '000000', alpha: 0 };
    return { hex: parts.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase(), alpha: parts[3] ?? 1 };
  }
  const px = value => parseFloat(value) || 0;
  function uniformScale(style) {
    if (style.scale === 'none') return 1;
    const [x, y = x, z = 1] = style.scale.split(/\s+/).map(Number);
    return x > 0 && x === y && z === 1 ? x : null;
  }
  const zoomCache = new Map();
  function localZoom(element) {
    if (!element || element === canvas || !canvas.contains(element)) return 1;
    if (!zoomCache.has(element)) {
      const style = getComputedStyle(element);
      zoomCache.set(element, (parseFloat(style.zoom) || 1) * (uniformScale(style) ?? 1) * localZoom(element.parentElement));
    }
    return zoomCache.get(element);
  }
  const pixelScale = element => canvas.contains(element) ? fontScale * localZoom(element) : sx;
  const textMetrics = document.createElement('canvas').getContext('2d');
  const contextCache = new Map();
  function context(element) {
    if (!element || element === canvas || !canvas.contains(element)) return [];
    if (contextCache.has(element)) return contextCache.get(element);
    const style = getComputedStyle(element), parent = context(element.parentElement);
    const stacking = (style.zIndex !== 'auto' && (style.position !== 'static' || ['flex', 'grid'].includes(getComputedStyle(element.parentElement).display))) || ['fixed', 'sticky'].includes(style.position) || style.isolation === 'isolate' || style.transform !== 'none' || style.scale !== 'none' || Number(style.opacity) < 1 || style.filter !== 'none' || style.mixBlendMode !== 'normal';
    const z = parseInt(style.zIndex, 10) || 0;
    const key = stacking ? [...parent, z < 0 ? 1 : z > 0 ? 4 : 3, z, order.get(element)] : parent;
    contextCache.set(element, key); return key;
  }
  function emit(item, owner, background = false) {
    // z-index 归属最近 stacking context，而非 DOM 父节点；保留跨父节点的定位层级。
    const ownContext = context(owner), parentContext = context(owner.parentElement);
    let phase = 2;
    for (let ancestor = owner; ancestor && ancestor !== canvas; ancestor = ancestor.parentElement) {
      if (context(ancestor).length < ownContext.length) break;
      if (getComputedStyle(ancestor).position !== 'static') { phase = 3; break; }
    }
    if (background && (owner === canvas || ownContext.length > parentContext.length)) phase = 0;
    const key = [...ownContext, phase, 0, paint.length];
    paint.push({ item, key });
  }
  function font(style, element) {
    const ink = color(style.color);
    const scale = pixelScale(element);
    return {
      // 网页字体不随 PPTX 嵌入，统一微软雅黑，避免 Office 随机回退成宋体等字体。
      fontFamily: 'Microsoft YaHei',
      fontSize: Math.max(2, px(style.fontSize) * scale), color: ink.hex, opacity: ink.alpha,
      bold: Number(style.fontWeight) >= 600 || style.fontWeight === 'bold', italic: style.fontStyle === 'italic',
      underline: style.textDecorationLine.includes('underline'), charSpacing: px(style.letterSpacing) * scale,
    };
  }
  function textLines(node, keepWhitespace = false) {
    const style = getComputedStyle(node.parentElement);
    if (style.visibility !== 'visible' || color(style.color).alpha === 0) return [];
    const range = document.createRange(), lines = [];
    let offset = 0;
    // 逐码点测量实际换行，避免把中文、混合字体或自动换行交给 Office 再排一次。
    for (const character of node.textContent) {
      range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
      const rect = range.getBoundingClientRect();
      if (!visibleRect(rect) || rect.width < 0.01) continue;
      let line = lines.at(-1);
      if (!line || Math.abs(line.top - rect.top) > 2 || rect.left < line.left - 2) {
        line = { text: '', left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        lines.push(line);
      }
      line.text += /[\r\n\t]/.test(character) && !style.whiteSpace.startsWith('pre') ? ' ' : character;
      line.right = Math.max(line.right, rect.right); line.bottom = Math.max(line.bottom, rect.bottom);
    }
    return lines.filter(line => keepWhitespace || line.text.trim()).map(line => {
      let text = line.text;
      if (style.textTransform === 'uppercase') text = text.toUpperCase();
      if (style.textTransform === 'lowercase') text = text.toLowerCase();
      if (style.textTransform === 'capitalize') text = text.replace(/\b\p{L}/gu, c => c.toUpperCase());
      const geometry = box({ ...line, width: line.right - line.left, height: line.bottom - line.top });
      const run = { text, ...font(style, node.parentElement) };
      // Range 顶部包含网页字体 ascent 留白。按实际基线定位，避免换字体后整体上移。
      textMetrics.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ascent = textMetrics.measureText(text).fontBoundingBoxAscent;
      if (Number.isFinite(ascent)) geometry.y += ascent * pixelScale(node.parentElement) - run.fontSize;
      return { type: 'text', ...geometry, width: geometry.width + 2, wrap: false,
        paragraphs: [{ align: 'left', runs: [run] }] };
    });
  }
  function raster(element, kind = 'subtree', reason = '') {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (!visibleRect(rect)) return;
    const padding = { left: 0, top: 0, right: 0, bottom: 0 };
    for (const shadow of (style.boxShadow + ',' + style.textShadow).replace(/rgba?\([^)]*\)/g, '').split(',')) {
      if (shadow.includes('inset')) continue;
      const values = shadow.match(/-?[\d.]+px/g)?.map(px);
      if (!values || values.length < 2) continue;
      const [x, y, blur = 0, spread = 0] = values, extent = Math.max(0, blur * 1.5 + spread);
      padding.left = Math.max(padding.left, extent - x); padding.right = Math.max(padding.right, extent + x);
      padding.top = Math.max(padding.top, extent - y); padding.bottom = Math.max(padding.bottom, extent + y);
    }
    const zoom = localZoom(element), factor = bounds.width / canvas.offsetWidth * zoom;
    const area = { left: Math.max(bounds.left, rect.left - padding.left * factor), top: Math.max(bounds.top, rect.top - padding.top * factor), right: Math.min(bounds.right, rect.right + padding.right * factor), bottom: Math.min(bounds.bottom, rect.bottom + padding.bottom * factor) };
    area.width = area.right - area.left; area.height = area.bottom - area.top;
    const target = targets.push({ element, kind, padding, zoom }) - 1;
    emit({ type: 'image', ...box(area), target }, element, kind === 'background');
    if (reason) warnings.add(reason);
  }
  function simpleTable(table) {
    const rows = [...table.rows];
    if (!rows.length || !rows[0].cells.length || rows.some(row => row.cells.length !== rows[0].cells.length || [...row.cells].some(cell => cell.colSpan !== 1 || cell.rowSpan !== 1 || cell.querySelector('img,svg,canvas,table')))) return false;
    if ([table, ...table.querySelectorAll('*')].some(el => {
      const style = getComputedStyle(el);
      return style.backgroundImage !== 'none' || style.boxShadow !== 'none' || style.textShadow !== 'none' || style.transform !== 'none' || Number(style.opacity) < 1;
    })) return false;
    const result = { type: 'table', ...box(table.getBoundingClientRect()), columns: [...rows[0].cells].map(cell => cell.getBoundingClientRect().width * sx), rows: [] };
    for (const [rowIndex, row] of rows.entries()) {
      const cells = [];
      for (const [columnIndex, cell] of [...row.cells].entries()) {
        const style = getComputedStyle(cell);
        const scale = pixelScale(cell);
        const lines = [];
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          lines.push(...textLines(node, true));
        }
        const paragraphs = [];
        let previous;
        for (const line of lines) {
          if (previous && Math.abs(previous.y - line.y) < Math.max(3, line.height * 0.3)) previous.paragraph.runs.push(...line.paragraphs[0].runs);
          else {
            const paragraph = { ...line.paragraphs[0], align: ['left', 'center', 'right'].includes(style.textAlign) ? style.textAlign : 'left' };
            paragraphs.push(paragraph); previous = { y: line.y, paragraph };
          }
        }
        const entry = { paragraphs, wrap: false, marginTop: px(style.paddingTop) * scale, marginRight: px(style.paddingRight) * scale,
          marginBottom: px(style.paddingBottom) * scale, marginLeft: px(style.paddingLeft) * scale,
          verticalAlign: style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'bottom' : 'top' };
        // 表格的背景常写在 tr/table 上；合成到每个单元格，保留白字深底等组合。
        const backgrounds = [];
        for (let ancestor = cell; ancestor; ancestor = ancestor.parentElement) {
          const layer = color(getComputedStyle(ancestor).backgroundColor); backgrounds.unshift(layer);
          if (layer.alpha === 1) break;
        }
        let rgb = [255, 255, 255];
        for (const layer of backgrounds) rgb = rgb.map((n, index) => Math.round(parseInt(layer.hex.slice(index * 2, index * 2 + 2), 16) * layer.alpha + n * (1 - layer.alpha)));
        entry.fill = rgb.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
        for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
          const atEdge = side === 'Top' ? rowIndex === 0 : side === 'Bottom' ? rowIndex === rows.length - 1 : side === 'Left' ? columnIndex === 0 : columnIndex === row.cells.length - 1;
          const candidates = [cell, ...(['Top', 'Bottom'].includes(side) || atEdge ? [row] : []), ...(atEdge ? [table] : [])].map(node => getComputedStyle(node));
          // 合并边框时较粗的外框优先，不能总取单元格较细的灰线。
          if (getComputedStyle(table).borderCollapse === 'collapse') candidates.sort((a, b) => px(b[`border${side}Width`]) - px(a[`border${side}Width`]));
          const borderStyle = candidates.find(s => px(s[`border${side}Width`]) && color(s[`border${side}Color`]).alpha);
          if (borderStyle) entry[`border${side}`] = { color: color(borderStyle[`border${side}Color`]).hex, width: px(borderStyle[`border${side}Width`]) * scale };
        }
        cells.push(entry);
      }
      result.rows.push({ height: row.getBoundingClientRect().height * sy, cells });
    }
    // Office 的共享边可能被相邻单元格的 noFill 覆盖；把合并后的线同步到两侧。
    for (let row = 0; row < result.rows.length; row++) {
      for (let column = 0; column < result.columns.length; column++) {
        const cell = result.rows[row].cells[column];
        const merge = (neighbor, ownSide, neighborSide) => {
          const first = cell[ownSide], second = neighbor[neighborSide];
          const border = !first ? second : !second || first.width >= second.width ? first : second;
          if (border) { cell[ownSide] = border; neighbor[neighborSide] = border; }
        };
        if (row + 1 < result.rows.length) merge(result.rows[row + 1].cells[column], 'borderBottom', 'borderTop');
        if (column + 1 < result.columns.length) merge(result.rows[row].cells[column + 1], 'borderRight', 'borderLeft');
      }
    }
    emit(result, table); return true;
  }
  function svgPaint(value, defs) {
    if (!value || value === 'none') return null;
    if (value.startsWith('url(')) {
      const id = value.replace(/url\(#([^)]+)\)/, '$1');
      return defs.get(id) || null;                       // { from, to } 渐变
    }
    let hex = value.trim();
    if (hex.startsWith('#')) {
      if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
      return { hex: hex.slice(1).toUpperCase(), alpha: 1 };
    }
    const rgb = color(value);
    return rgb.alpha ? rgb : null;
  }
  /* SVG 图表分解：rect/line/text → 原生形状/连接线/文本框（可编辑）；path 弧线走抠图。
     坐标：viewBox 用户单位 × 缩放映射到画布，再复用 box() 换算场景坐标。 */
  function parsePathD(d) {
    /* deck 图表词汇表：绝对坐标 M/L/H/V/Q/Z（弧线=带 Q 拐角的折线或二次曲线） */
    const tokens = d.match(/[MLHVQZ]|-?[\d.]+/g) || [];
    const segs = [];
    let i = 0, cx = 0, cy = 0, start = [0, 0];
    const num = () => parseFloat(tokens[i++]);
    while (i < tokens.length) {
      const cmd = tokens[i++];
      if (cmd === 'M') { cx = num(); cy = num(); start = [cx, cy]; segs.push({ t: 'M', p: [cx, cy] }); }
      else if (cmd === 'L') { cx = num(); cy = num(); segs.push({ t: 'L', p: [cx, cy] }); }
      else if (cmd === 'H') { cx = num(); segs.push({ t: 'L', p: [cx, cy] }); }
      else if (cmd === 'V') { cy = num(); segs.push({ t: 'L', p: [cx, cy] }); }
      else if (cmd === 'Q') { const c = [num(), num()], p2 = [num(), num()]; cx = p2[0]; cy = p2[1]; segs.push({ t: 'Q', c, p: p2 }); }
      else if (cmd === 'Z') { segs.push({ t: 'Z' }); cx = start[0]; cy = start[1]; }
    }
    return segs;
  }
  function visitSvg(svg) {
    if (svg.classList.contains('fx-layer') || svg.classList.contains('ambient-layer')) return;   // 动画层不进快照
    const rect0 = svg.getBoundingClientRect();
    if (!visibleRect(rect0)) return;
    const vb = svg.viewBox.baseVal;
    if (!vb.width || !vb.height) return;
    const ux = rect0.width / vb.width, uy = rect0.height / vb.height;
    const defs = new Map();
    for (const g of svg.querySelectorAll('linearGradient')) {
      const stops = [...g.querySelectorAll('stop')].map(stop => svgPaint(stop.getAttribute('stop-color'), defs));
      const solid = stops.filter(Boolean);
      defs.set(g.id, solid.length >= 2 ? { from: solid[0].hex, to: solid[solid.length - 1].hex } : null);
    }
    const canvasRect = vr => {
      const left = (vr.left - bounds.left) * sx, top = (vr.top - bounds.top) * sy;
      return { x: left, y: top, width: vr.width * sx, height: vr.height * sy };
    };
    const vrOf = (x, y, w, h) => ({ left: rect0.left + x * ux, top: rect0.top + y * uy, width: w * ux, height: h * uy });
    for (const node of svg.querySelectorAll('rect, circle, ellipse, line, text, path')) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || node.closest('defs')) continue;
      const tag = node.tagName;
      if (tag === 'circle' || tag === 'ellipse') {
        const isCircle = tag === 'circle';
        const cx = px(node.getAttribute('cx')), cy = px(node.getAttribute('cy'));
        const rx = isCircle ? px(node.getAttribute('r')) : px(node.getAttribute('rx'));
        const ry = isCircle ? px(node.getAttribute('r')) : px(node.getAttribute('ry'));
        if (rx <= 0 || ry <= 0) continue;
        const fill = svgPaint(node.getAttribute('fill'), defs);
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        const sw = px(node.getAttribute('stroke-width')) || 1;
        const shape = { type: 'shape', ...canvasRect(vrOf(cx - rx, cy - ry, rx * 2, ry * 2)), geometry: 'ellipse' };
        if (fill && fill.from) shape.gradient = fill;
        else if (fill) { shape.fill = fill.hex; shape.opacity = fill.alpha; }
        if (stroke && sw > 0) shape.border = { color: stroke.hex, opacity: stroke.alpha, width: sw * ux, dash: !!node.getAttribute('stroke-dasharray') };
        emit(shape, node, true);
      } else if (tag === 'rect') {
        const x = px(node.getAttribute('x')), y = px(node.getAttribute('y'));
        const w = px(node.getAttribute('width')), h = px(node.getAttribute('height'));
        if (w <= 0 || h <= 0) continue;
        const rx = px(node.getAttribute('rx'));
        const fill = svgPaint(node.getAttribute('fill'), defs);
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        const sw = px(node.getAttribute('stroke-width')) || 1;
        const shape = { type: 'shape', ...canvasRect(vrOf(x, y, w, h)), geometry: rx > 0 ? 'roundRect' : 'rect', radius: rx * ux };
        if (fill && fill.from) shape.gradient = fill;
        else if (fill) { shape.fill = fill.hex; shape.opacity = fill.alpha; }
        if (stroke && sw > 0) shape.border = { color: stroke.hex, opacity: stroke.alpha, width: sw * ux, dash: !!node.getAttribute('stroke-dasharray') };
        emit(shape, node, true);
      } else if (tag === 'line') {
        const x1 = px(node.getAttribute('x1')), y1 = px(node.getAttribute('y1'));
        const x2 = px(node.getAttribute('x2')), y2 = px(node.getAttribute('y2'));
        const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
        if (width < 0.01 && height < 0.01) continue;
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        if (!stroke) continue;
        const shape = { type: 'shape', ...canvasRect(vrOf(Math.min(x1, x2), Math.min(y1, y2), width, height)),
          geometry: 'line', stroke: { color: stroke.hex, width: (px(node.getAttribute('stroke-width')) || 1.5) * ux },
          arrow: node.hasAttribute('marker-end'), dash: !!node.getAttribute('stroke-dasharray'),
          flipH: x2 < x1, flipV: y2 < y1 };
        emit(shape, node, true);
      } else if (tag === 'text') {
        const content = node.textContent.trim();
        if (!content) continue;
        const x = px(node.getAttribute('x')), y = px(node.getAttribute('y'));
        const fontSize = (px(node.getAttribute('font-size')) || parseFloat(getComputedStyle(node).fontSize) || 10) * uy;
        const weight = Number(node.getAttribute('font-weight') || getComputedStyle(node).fontWeight || 400);
        const fill = svgPaint(node.getAttribute('fill') || getComputedStyle(node).fill, defs);
        const w = (textMetrics.font = `${getComputedStyle(node).fontWeight} ${getComputedStyle(node).fontSize} ${getComputedStyle(node).fontFamily}`, textMetrics.measureText(content).width) * ux;
        const anchor = node.getAttribute('text-anchor') || 'start';
        const xvp = rect0.left + x * ux, yvp = rect0.top + y * uy;
        const left = anchor === 'middle' ? xvp - w / 2 : anchor === 'end' ? xvp - w : xvp;
        const height = fontSize * 1.35;
        const text = { type: 'text', ...canvasRect({ left, top: yvp - fontSize * 0.85, width: w, height }), width: w + 2, wrap: false,
          paragraphs: [{ align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
            runs: [{ text: content, fontFamily: 'Microsoft YaHei', fontSize, color: fill ? fill.hex : '000000', opacity: fill ? fill.alpha : 1, bold: weight >= 600 }] }] };
        emit(text, node);
      } else if (tag === 'path') {
        const d = node.getAttribute('d');
        if (!d) continue;
        const segs = parsePathD(d);
        if (segs.length < 2) continue;
        const pts = [];
        for (const sg of segs) { pts.push(sg.p); if (sg.c) pts.push(sg.c); }
        const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
        const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
        const stroke = svgPaint(node.getAttribute('stroke'), defs);
        if (!stroke) continue;
        const rel = vrOf(minX, minY, maxX - minX, maxY - minY);
        const origin = [rect0.left + minX * ux, rect0.top + minY * uy];
        const relSegs = segs.map(sg => {
          const relPt = p => [Math.round((p[0] - minX) * ux * 100) / 100, Math.round((p[1] - minY) * uy * 100) / 100];
          const out = { t: sg.t, p: relPt(sg.p) };
          if (sg.c) out.c = relPt(sg.c);
          return out;
        });
        const shape = { type: 'freeform', ...canvasRect(rel), segs: relSegs,
          stroke: { color: stroke.hex, width: (px(node.getAttribute('stroke-width')) || 1.5) * ux, dash: !!node.getAttribute('stroke-dasharray') } };
        emit(shape, node, true);
      }
    }
  }
  function visit(element) {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(element.tagName) || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
    const pseudos = ['::before', '::after'].map(which => getComputedStyle(element, which)).filter(p => p.display !== 'none' && !['none', 'normal'].includes(p.content));
    if (element !== canvas) {
      const matrix = style.transform !== 'none' ? new DOMMatrix(style.transform) : null;
      const transformed = uniformScale(style) === null || (matrix && (Math.abs(matrix.a - 1) > 0.001 || Math.abs(matrix.d - 1) > 0.001 || Math.abs(matrix.b) > 0.001 || Math.abs(matrix.c) > 0.001 || !matrix.is2D));
      const clipped = (['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 2) || (['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2);
      const pseudo = pseudos.some(p => p.content !== '""');
      if (element.tagName === 'svg') { visitSvg(element); return; }   // SVG 图表分解为原生可编辑对象
      if (['CANVAS', 'IMG', 'VIDEO', 'IFRAME', 'OBJECT'].includes(element.tagName) || transformed || clipped || pseudo || Number(style.opacity) < 1 || style.filter !== 'none' || style.clipPath !== 'none' || style.maskImage !== 'none' || style.mixBlendMode !== 'normal' || px(style.webkitTextStrokeWidth) > 0) {   // text-shadow 不再触发转图片：阴影丢弃，文字保持可编辑
        raster(element, 'subtree', '复杂图形或特殊效果已保留为图片'); return;
      }
    }
    if (element.tagName === 'TABLE') {
      if (!simpleTable(element)) raster(element, 'subtree', '含合并单元格或图形的表格已保留为图片');
      return;
    }
    if (visibleRect(rect)) {
      const fill = color(style.backgroundColor), border = color(style.borderTopColor);
      const widths = ['Top', 'Right', 'Bottom', 'Left'].map(side => px(style[`border${side}Width`]));
      const radii = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(corner => px(style[`border${corner}Radius`]));
      const uniformBorder = widths.every(w => w === widths[0]) && ['Right', 'Bottom', 'Left'].every(side => style[`border${side}Color`] === style.borderTopColor && style[`border${side}Style`] === style.borderTopStyle);
      const complex = pseudos.length > 0 || style.backgroundImage !== 'none' || style.boxShadow !== 'none' || !radii.every(r => r === radii[0]) || (!uniformBorder && widths.some(Boolean)) || (widths.some(Boolean) && !['solid', 'none'].includes(style.borderTopStyle));
      if (complex) raster(element, 'background', '复杂背景效果已保留为图片');
      else if (fill.alpha || widths.some(Boolean)) {
        const geometry = box(rect);
        const ellipse = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].every(corner => getComputedStyle(element)[`border${corner}Radius`] === '50%');
        const shape = { type: 'shape', ...geometry, geometry: ellipse ? 'ellipse' : radii[0] ? 'roundRect' : 'rect', radius: radii[0] * pixelScale(element) };
        if (fill.alpha) { shape.fill = fill.hex; shape.opacity = fill.alpha; }
        if (widths[0] && border.alpha) shape.border = { color: border.hex, opacity: border.alpha, width: widths[0] * pixelScale(element) };
        emit(shape, element, true);
      }
    }
    // 普通布局按 DOM 绘制；定位元素依 z-index 排序，图片兜底仍处于对应层级。
    const nodes = [...element.childNodes].sort((a, b) => {
      const z = node => node.nodeType === Node.ELEMENT_NODE ? (parseInt(getComputedStyle(node).zIndex, 10) || 0) : 0;
      return z(a) - z(b);
    });
    for (const child of nodes) {
      if (child.nodeType === Node.ELEMENT_NODE) visit(child);
      else if (child.nodeType === Node.TEXT_NODE) for (const line of textLines(child)) emit(line, element);
    }
  }
  // 画布透明时保留祖先的平面底色。
  let backdrop = canvas;
  while (backdrop && !color(getComputedStyle(backdrop).backgroundColor).alpha) backdrop = backdrop.parentElement;
  elements.push({ type: 'shape', x: 0, y: 0, width: 1920, height: 1080, geometry: 'rect', fill: backdrop ? color(getComputedStyle(backdrop).backgroundColor).hex : 'FFFFFF' });
  visit(canvas);
  // 模板品牌标识位于画布外、以 fixed 方式显示；作为独立图片保留。
  for (const logo of document.querySelectorAll('img[alt="HUAWEI"],img[data-brand-logo]')) {
    if (!canvas.contains(logo) && visibleRect(logo.getBoundingClientRect()) && getComputedStyle(logo).display !== 'none') {
      raster(logo); paint.at(-1).key = [Infinity];
    }
  }
  // 历史模板保密页脚也是 fixed 外壳元素；新模板可用显式品牌页脚属性。
  for (const footer of document.querySelectorAll('[data-brand-footer],.app > div')) {
    if (canvas.contains(footer) || (footer.textContent.trim() !== 'Huawei Confidential' && !footer.hasAttribute('data-brand-footer'))
      || getComputedStyle(footer).position !== 'fixed') continue;
    const start = paint.length;
    visit(footer);
    for (const entry of paint.slice(start)) entry.key = [Infinity];
  }
  paint.sort((a, b) => {
    for (let index = 0; index < Math.max(a.key.length, b.key.length); index++) {
      const delta = (a.key[index] ?? 0) - (b.key[index] ?? 0);
      if (delta) return delta;
    }
    return 0;
  });
  elements.push(...paint.map(entry => entry.item));
  window.__aicoEditableCapture = { targets, canvas };
  return { name: canvas.querySelector('section[data-label]')?.getAttribute('data-label') || `第 ${slideIndex + 1} 页`, elements, warnings: [...warnings] };
}
/* ═══ COLLECTOR:END ═══ */
/* —— 页内元素抠图：foreignObject 透明底 PNG（图片类对象用） —— */
    async function elementPng(target) {
        const element = target.element;
        const rect = element.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
        const deckCss = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
        const clone = element.cloneNode(true);
        if (target.kind === 'background') clone.querySelectorAll('*').forEach(n => { n.style.visibility = 'hidden'; });
        // 克隆体强制钉在裁剪原点：绝对定位/偏移样式会让内容飞出裁剪画布，导出成全透明空图（元素消失根因）
        for (const [prop, value] of [['position', 'absolute'], ['left', '0'], ['top', '0'], ['margin', '0'],
                                     ['width', rect.width + 'px'], ['height', rect.height + 'px']]) {
            clone.style.setProperty(prop, value, 'important');
        }
        const wrap = document.createElement('div');
        wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        const style = document.createElement('style');
        style.textContent = deckCss + '\n' + SNAPSHOT_CSS;
        wrap.appendChild(style);
        wrap.appendChild(clone);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', w); svg.setAttribute('height', h);
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('width', '100%'); fo.setAttribute('height', '100%');
        fo.appendChild(wrap);
        svg.appendChild(fo);
        return new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = w * SCALE; canvas.height = h * SCALE;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(b => b ? res(b) : rej(new Error('canvas.toBlob 失败')), 'image/png');
            };
            img.onerror = () => rej(new Error('元素抠图失败'));
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
        });
    }

    /* —— 可编辑 OOXML 绘图（自 build_editable_pptx.py Drawing 移植） —— */
    const ALIGN = { left: 'l', center: 'ctr', right: 'r' };
    const VERTICAL = { top: 't', center: 'ctr', bottom: 'b' };
    const TABLE_URI = 'http://schemas.openxmlformats.org/drawingml/2006/table';
    class EditableDrawing {
        constructor(w, h) { this.sx = WIDTH / w; this.sy = HEIGHT / h; }
        x(v) { return Math.round(v * this.sx); }
        y(v) { return Math.round(v * this.sy); }
        points(v) { return Math.round(v * this.sy / 127); }
        box(el, line = false) {
            const left = this.x(el.x), top = this.y(el.y);
            const width = this.x(el.width || 0), height = this.y(el.height || 0);
            if ((!line && (width === 0 || height === 0)) || (width === 0 && height === 0)) throw new Error('元素尺寸必须大于零；直线允许一边为零');
            return [left, top, width, height];
        }
        transform(box, prefix = 'a') { const [l, t, w, h] = box; return `<${prefix}:xfrm><a:off x="${l}" y="${t}"/><a:ext cx="${w}" cy="${h}"/></${prefix}:xfrm>`; }
        ln(border, tag = 'ln') {
            if (!border) return `<a:${tag}><a:noFill/></a:${tag}>`;
            const w = this.y(border.width || 0);
            const fill = border.color ? `<a:solidFill><a:srgbClr val="${border.color}"/></a:solidFill>` : '<a:noFill/>';
            const dash = border.dash ? '<a:prstDash val="dash"/>' : '<a:prstDash val="solid"/>';
            return `<a:${tag} w="${w}">${fill}${dash}</a:${tag}>`;
        }
        paragraphs(paras) {
            const result = [];
            for (const para of paras) {
                const align = ALIGN[para.align] ?? 'l';
                const spacing = para.lineHeight ? `<a:lnSpc><a:spcPts val="${this.points(para.lineHeight)}"/></a:lnSpc>` : '';
                const runs = [];
                for (const run of para.runs) {
                    const size = this.points(run.fontSize);
                    const attrs = `sz="${size}" b="${run.bold ? 1 : 0}" i="${run.italic ? 1 : 0}" u="${run.underline ? 'sng' : 'none'}"`
                        + (run.charSpacing ? ` spc="${Math.round(run.charSpacing * this.sx / 127)}"` : '');
                    const fmt = `<a:rPr ${attrs}>${solidFill(run.color, run.opacity ?? 1)}<a:latin typeface="${esc(run.fontFamily)}"/><a:ea typeface="${esc(run.fontFamily)}"/><a:cs typeface="${esc(run.fontFamily)}"/></a:rPr>`;
                    const parts = String(run.text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
                    parts.forEach((piece, index) => {
                        if (index) runs.push(`<a:br>${fmt}</a:br>`);
                        runs.push(`<a:r>${fmt}<a:t xml:space="preserve">${esc(piece)}</a:t></a:r>`);
                    });
                }
                result.push(`<a:p><a:pPr algn="${align}" marL="0" marR="0" indent="0">${spacing}<a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>${runs.join('')}<a:endParaRPr/></a:p>`);
            }
            return result.join('') || '<a:p><a:endParaRPr/></a:p>';
        }
        textBody(paras, cell = false, wrap = true, topInset = 0) {
            const inset = this.y(topInset || 0);
            const props = cell ? '' : ' anchor="t" lIns="0" tIns="' + inset + '" rIns="0" bIns="0"';
            return `<a:bodyPr wrap="${wrap ? 'square' : 'none'}"${props}><a:noAutofit/></a:bodyPr><a:lstStyle/>${this.paragraphs(paras)}`;
        }
        text(el, id) {
            return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="文字 ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
                + `<p:spPr>${this.transform(this.box(el))}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>${this.ln()}</p:spPr>`
                + `<p:txBody>${this.textBody(el.paragraphs, false, el.wrap !== false, el.topInset || 0)}</p:txBody></p:sp>`;
        }
        shape(el, id) {
            if (el.geometry === 'freeform') return this.freeform(el, id);
            const isLine = el.geometry === 'line';
            const box = this.box(el, isLine);
            const adj = 'radius' in el && el.geometry === 'roundRect'
                ? `<a:gd name="adj" fmla="val ${Math.round(Math.min(el.radius / Math.min(el.width, el.height), 0.5) * 100000)}"/>` : '';
            const flips = (el.flipH ? ' flipH="1"' : '') + (el.flipV ? ' flipV="1"' : '');
            let props = isLine
                ? `<a:xfrm${flips ? ' ' + flips.trim() : ''}><a:off x="${box[0]}" y="${box[1]}"/><a:ext cx="${box[2]}" cy="${box[3]}"/></a:xfrm>`
                : this.transform(box);
            props += `<a:prstGeom prst="${el.geometry}"><a:avLst>${adj}</a:avLst></a:prstGeom>`;
            if (isLine) {
                const stroke = el.stroke || { color: '000000', width: 1.5 };
                const dash = stroke.dash || el.dash ? '<a:prstDash val="dash"/>' : '<a:prstDash val="solid"/>';
                const arrow = el.arrow ? '<a:tailEnd type="triangle" w="med" len="med"/>' : '';
                props += `<a:ln w="${this.y(stroke.width || 1.5)}">${solidFill(stroke.color, 1)}${dash}${arrow}</a:ln>`;
                return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="直线 ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${props}</p:spPr></p:cxnSp>`;
            }
            if (el.gradient) {
                props += `<a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="${el.gradient.from}"/></a:gs>`
                    + `<a:gs pos="100000"><a:srgbClr val="${el.gradient.to}"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="1"/></a:gradFill>`;
            } else if (el.fill) {
                props += solidFill(el.fill, el.opacity ?? 1);
            } else {
                props += '<a:noFill/>';
            }
            if (el.border) props += this.ln(el.border);
            return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="形状 ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${props}</p:spPr></p:sp>`;
        }
        freeform(el, id) {
            const commands = [];
            for (const seg of el.segs) {
                const pt = p => `<a:pt x="${Math.round(p[0] * this.sx)}" y="${Math.round(p[1] * this.sy)}"/>`;
                if (seg.t === 'M') commands.push(`<a:moveTo>${pt(seg.p)}</a:moveTo>`);
                else if (seg.t === 'L') commands.push(`<a:lnTo>${pt(seg.p)}</a:lnTo>`);
                else if (seg.t === 'Q') commands.push(`<a:cubicBezTo>${pt(seg.c)}${pt(seg.c)}${pt(seg.p)}</a:cubicBezTo>`);
                else if (seg.t === 'Z') commands.push('<a:close/>');
            }
            const w = Math.max(1, Math.round(el.width || 1)), h = Math.max(1, Math.round(el.height || 1));
            const stroke = el.stroke || { color: '000000', width: 1.5 };
            const dash = stroke.dash ? '<a:prstDash val="dash"/>' : '<a:prstDash val="solid"/>';
            const geom = `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect/><a:pathLst><a:path w="${w}" h="${h}">${commands.join('')}</a:path></a:pathLst></a:custGeom>`;
            const props = this.transform(this.box(el)) + geom
                + `<a:ln w="${this.y(stroke.width || 1.5)}">${solidFill(stroke.color, 1)}${dash}</a:ln>`;
            return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="自由曲线 ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${props}</p:spPr></p:sp>`;
        }
        table(el, id) {
            const grid = el.columns.map(w => `<a:gridCol w="${this.x(w)}"/>`).join('');
            const rows = el.rows.map(row => {
                const cells = row.cells.map(cell => {
                    const margins = `marL="${this.x(cell.marginLeft || 0)}" marR="${this.x(cell.marginRight || 0)}" marT="${this.y(cell.marginTop || 0)}" marB="${this.y(cell.marginBottom || 0)}" anchor="${VERTICAL[cell.verticalAlign || 'top']}"`;
                    const borders = ['lnL:borderLeft', 'lnR:borderRight', 'lnT:borderTop', 'lnB:borderBottom']
                        .map(pair => { const [tag, key] = pair.split(':'); return this.ln(cell[key], tag); }).join('');
                    return `<a:tc><a:txBody>${this.textBody(cell.paragraphs, true, cell.wrap !== false)}</a:txBody><a:tcPr ${margins}>${borders}${solidFill(cell.fill || null)}</a:tcPr></a:tc>`;
                }).join('');
                return `<a:tr h="${this.y(row.height)}">${cells}</a:tr>`;
            }).join('');
            return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="表格 ${id}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>`
                + `${this.transform(this.box(el), 'p')}<a:graphic><a:graphicData uri="${TABLE_URI}"><a:tbl><a:tblPr firstRow="0" bandRow="0"/><a:tblGrid>${grid}</a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
        }
    }

    /* —— 可编辑装配：场景 → 原生对象 XML → PPTX —— */
    async function exportEditable(deck) {
        const drawing = new EditableDrawing(W, H);
        const deckCss = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
        const files = [];
        const mediaByHash = new Map();
        let mediaSeq = 0;
        const slideXmls = [], slideRels = [];
        for (let i = 0; i < deck.slides.length; i++) {
            deck.flashHint('playerHint', `导出可编辑 PPTX ${i + 1}/${deck.slides.length}…`, 2000);
            const scene = collectEditableScene(i);
            const rels = [[1, 'slideLayout', '../slideLayouts/slideLayout1.xml']];
            const objects = [];
            let id = 2;
            for (const el of scene.elements) {
                if (el.type === 'image') {
                    const target = window.__aicoEditableCapture.targets[el.target];
                    const blob = await elementPng(target);
                    const u8 = new Uint8Array(await blob.arrayBuffer());
                    const key = u8.length + ':' + crc32(u8);
                    let name = mediaByHash.get(key);
                    if (!name) { name = `image${++mediaSeq}.png`; mediaByHash.set(key, name); files.push({ name: `ppt/media/${name}`, data: u8 }); }
                    const rel = rels.length + 1;
                    rels.push([rel, 'image', `../media/${name}`]);
                    objects.push(picture(id++, name, rel, drawing.x(el.x), drawing.y(el.y), drawing.x(el.width), drawing.y(el.height)));
                } else {
                    objects.push(drawing[el.type](el, id++));
                }
            }
            slideXmls.push(xml(
                `<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld name="${esc(scene.name)}"><p:spTree>`
                + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
                + objects.join('')
                + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'));
            slideRels.push(rels);
        }
        files.push({ name: '[Content_Types].xml', data: contentTypesImage(deck.slides.length) });
        files.push({ name: '_rels/.rels', data: relationships([[1, 'officeDocument', 'ppt/presentation.xml']]) });
        const slideIds = Array.from({ length: deck.slides.length }, (_, i) => `<p:sldId id="${255 + i + 1}" r:id="rId${i + 2}"/>`).join('');
        files.push({ name: 'ppt/presentation.xml', data: xml(
            `<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" autoCompressPictures="0">`
            + '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
            + `<p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${WIDTH}" cy="${HEIGHT}"/>`
            + '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>') });
        files.push({ name: 'ppt/_rels/presentation.xml.rels', data: relationships(
            [[1, 'slideMaster', 'slideMasters/slideMaster1.xml']]
            .concat(Array.from({ length: deck.slides.length }, (_, i) => [i + 2, 'slide', `slides/slide${i + 1}.xml`]))) });
        files.push({ name: 'ppt/slideMasters/slideMaster1.xml', data: TPL_MASTER });
        files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relationships([[1, 'slideLayout', '../slideLayouts/slideLayout1.xml'], [2, 'theme', '../theme/theme1.xml']]) });
        files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', data: TPL_LAYOUT });
        files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relationships([[1, 'slideMaster', '../slideMasters/slideMaster1.xml']]) });
        files.push({ name: 'ppt/theme/theme1.xml', data: TPL_THEME });
        slideXmls.forEach((sx, i) => files.push({ name: `ppt/slides/slide${i + 1}.xml`, data: sx }));
        slideRels.forEach((rels, i) => files.push({ name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: relationships(rels) }));
        downloadPptx(zipStore(files), deck, '可编辑 PPTX 已下载 ✓（文字/形状/图表对象可直接编辑）');
    }

    function bind(deck) {
        const guard = (btn, fn) => {
            if (!btn) return;
            btn.addEventListener('click', async () => {
                if (btn.dataset.busy) return;
                const label = btn.textContent;
                btn.dataset.busy = '1'; btn.textContent = '⤓ 导出中…';
                try { await fn(deck); } catch (e) { deck.flashHint('playerHint', '导出失败：' + e.message, 4000); }
                delete btn.dataset.busy; btn.textContent = label;
            });
        };
        guard(document.getElementById('pptxBtn'), exportEditable);
        guard(document.getElementById('snapBtn'), exportSnapshot);
    }
    return { exportEditable, exportSnapshot, bind };
})();
(function () {
    const boot = () => { if (window.__deck && window.DeckExport) window.DeckExport.bind(window.__deck); };
    if (window.__deck) boot(); else addEventListener('load', boot, { once: true });
})();
