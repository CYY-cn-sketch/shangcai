export type PptSlideOutline = [string, string, string];

export type PptxBuildInput = {
  title: string;
  content?: string;
  references?: Array<{ title: string }>;
  contentSource?: "LEXIANG" | "DEEPSEEK";
};

export type PptArtifactBlock = { title: string; items: string[] };

const MAX_SLIDES = 30;

function cleanSlideText(value: string) {
  return value
    .replace(/^[-*+\s]+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function toSlideOutline(line: string): PptSlideOutline {
  const cleaned = cleanSlideText(line)
    .replace(/^第?\s*\d+\s*页[：:｜|、.)]?\s*/, "")
    .replace(/^\d+[.、)]\s*/, "");
  const parts = cleaned
    .split(/[｜|]/)
    .map(cleanSlideText)
    .filter(Boolean);
  return [
    parts[0] || cleaned.slice(0, 18) || "PPT 页面",
    parts[1] || "基于当前项目内容形成的页面观点",
    parts[2] || parts[3] || "根据本页观点配置证据、图表或视觉素材",
  ];
}

export function buildPptOutlineContent(blocks?: PptArtifactBlock[], fallbackContent?: string) {
  const usableBlocks = (blocks || []).filter((block) => block.title.trim() || block.items.some((item) => item.trim()));
  if (usableBlocks.length === 0) return fallbackContent?.trim() || "";

  const pageItems = usableBlocks.flatMap((block) => block.items.filter((item) => /第?\s*\d+\s*页|^\d+[.、)]/.test(item.trim())));
  if (pageItems.length > 0) return pageItems.slice(0, MAX_SLIDES).join("\n");

  return usableBlocks
    .slice(0, MAX_SLIDES)
    .map((block, index) => {
      const items = block.items.map(cleanSlideText).filter(Boolean);
      const title = cleanSlideText(block.title).replace(/^第?\s*\d+\s*页[：:]?\s*/, "") || `第 ${index + 1} 页`;
      const statement = items[0] || "基于当前项目内容形成的页面观点";
      const visual = items[1] || "根据本页观点配置证据、图表或视觉素材";
      return `第 ${index + 1} 页：${title}｜${statement}｜${visual}`;
    })
    .join("\n");
}

export function parsePptSlideOutline(content?: string): PptSlideOutline[] {
  const lines = (content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const numberedSlides = lines
    .filter((line) => /^(?:[-*+]\s*)?(?:第?\s*\d+\s*页|\d+[.、)])/.test(line))
    .slice(0, MAX_SLIDES)
    .map(toSlideOutline);
  if (numberedSlides.length > 0) return numberedSlides;

  const headingIndexes = lines
    .map((line, index) => (/^#{1,6}\s+/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  if (headingIndexes.length === 0) return [];

  return headingIndexes.slice(0, MAX_SLIDES).map((headingIndex, index) => {
    const nextHeadingIndex = headingIndexes[index + 1] ?? lines.length;
    const body = lines
      .slice(headingIndex + 1, nextHeadingIndex)
      .map(cleanSlideText)
      .filter(Boolean);
    return [
      cleanSlideText(lines[headingIndex].replace(/^#{1,6}\s+/, "")),
      body[0] || "基于当前项目内容形成的页面观点",
      body[1] || "根据本页观点配置证据、图表或视觉素材",
    ];
  });
}

function safeFileName(value: string) {
  const name = value.replace(/[\\/:*?"<>|]/g, "_").trim() || "路演PPT";
  return `${name.replace(/\.pptx$/i, "")}.pptx`;
}

export async function buildPptxFile(input: PptxBuildInput): Promise<File> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const slides = parsePptSlideOutline(input.content);
  if (slides.length === 0) {
    throw new Error("当前 AI 成果没有可识别的逐页 PPT 结构，请先让路演 PPT 专家生成页面大纲");
  }
  const sourceLabel = input.references?.length
    ? `参考资料：${input.references.slice(0, 3).map((item) => item.title).join("、")}`
    : input.contentSource === "LEXIANG"
      ? "内容来源：乐享知识库"
      : "内容来源：当前 DeepSeek 路演成果";

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "上海财经大学商学院";
  pptx.company = "上海财经大学商学院";
  pptx.subject = "创业实践教学阶段成果";
  pptx.title = input.title;

  slides.forEach(([title, statement, visual], index) => {
    const slide = pptx.addSlide();
    slide.background = { color: "F4F7FB" };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.22, fill: { color: "003B79" }, line: { color: "003B79" } });
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: 0.55,
      y: 0.52,
      w: 0.9,
      h: 0.4,
      fontFace: "Arial",
      fontSize: 14,
      bold: true,
      color: "BF8F2A",
      margin: 0,
    });
    slide.addText(title, {
      x: 1.45,
      y: 0.42,
      w: 10.9,
      h: 0.65,
      fontFace: "Microsoft YaHei",
      fontSize: 26,
      bold: true,
      color: "10233F",
      margin: 0,
      breakLine: false,
      fit: "shrink",
    });
    slide.addShape(pptx.ShapeType.line, { x: 0.58, y: 1.22, w: 12.15, h: 0, line: { color: "CBD7E6", width: 1 } });
    slide.addText(statement, {
      x: 0.75,
      y: 1.75,
      w: 11.85,
      h: 2.15,
      fontFace: "Microsoft YaHei",
      fontSize: 25,
      bold: true,
      color: "003B79",
      align: "center",
      valign: "middle",
      margin: 0.15,
      fit: "shrink",
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.15,
      y: 4.35,
      w: 11.05,
      h: 1.25,
      rectRadius: 0.08,
      fill: { color: "E9F0F8" },
      line: { color: "B8C8DC", width: 1 },
    });
    slide.addText(`页面表达建议：${visual}`, {
      x: 1.45,
      y: 4.68,
      w: 10.45,
      h: 0.58,
      fontFace: "Microsoft YaHei",
      fontSize: 16,
      color: "304866",
      align: "center",
      valign: "middle",
      margin: 0,
      fit: "shrink",
    });
    slide.addText(sourceLabel, {
      x: 0.7,
      y: 6.75,
      w: 10.9,
      h: 0.3,
      fontFace: "Microsoft YaHei",
      fontSize: 8.5,
      color: "6B7C93",
      margin: 0,
      fit: "shrink",
    });
    slide.addText(`${index + 1} / ${slides.length}`, {
      x: 11.75,
      y: 6.72,
      w: 0.9,
      h: 0.3,
      fontFace: "Arial",
      fontSize: 9,
      color: "6B7C93",
      align: "right",
      margin: 0,
    });
  });

  const output = await pptx.write({ outputType: "blob", compression: true });
  const blob = output instanceof Blob ? output : new Blob([output as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  return new File([blob], safeFileName(input.title), {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
