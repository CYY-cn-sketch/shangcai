export type PptSlideOutline = [string, string, string];

export type PptxBuildInput = {
  title: string;
  content?: string;
  references?: Array<{ title: string }>;
};

const defaultSlides: PptSlideOutline[] = [
  ["项目愿景", "用 AI 降低学生完成创业实践任务的门槛", "展示课程场景与教学价值"],
  ["用户痛点", "学生缺少持续、个性化、可复盘的过程反馈", "呈现学生、教师和学院三类需求"],
  ["解决方案", "连接创意、定位、BP、PPT、答辩与教师审核", "绘制教学闭环流程图"],
  ["市场机会", "高校实践教学正在进入全过程数字化阶段", "说明试点窗口与建设必要性"],
  ["差异定位", "核心差异是课程知识、教师审核和成果沉淀", "使用竞品对比矩阵"],
  ["运行模式", "以课程试点带动平台持续使用与内容积累", "展示角色、任务和数据流"],
  ["产品路径", "从高频课堂任务切入，逐步扩展专家能力", "展示阶段路线图"],
  ["试点方案", "按课程周次组织学生生成、教师反馈和复盘", "呈现试点范围与验收指标"],
  ["成效指标", "同时衡量学生完成度、教师效率与成果质量", "使用过程指标和结果指标表"],
  ["行动计划", "完成配置确认、课程试用、数据复盘与验收", "展示里程碑和责任人"],
];

export function parsePptSlideOutline(content?: string): PptSlideOutline[] {
  const parsed = (content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /第?\s*\d+\s*页|^\d+[.、)]/.test(line))
    .slice(0, 10)
    .map<PptSlideOutline>((line) => {
      const cleaned = line
        .replace(/^[-*\s]*/, "")
        .replace(/^第?\s*\d+\s*页[：:｜|、.)]?\s*/, "")
        .replace(/^\d+[.、)]\s*/, "");
      const parts = cleaned
        .split(/[｜|]/)
        .map((part) => part.trim())
        .filter(Boolean);
      return [
        parts[0] || cleaned.slice(0, 18) || "PPT 页面",
        parts[1] || parts[2] || "基于当前项目内容形成的页面观点",
        parts[2] || parts[3] || "补充图表、数据或课堂证据",
      ];
    });

  if (parsed.length === 0) return defaultSlides.map((slide) => [...slide]);
  return [...parsed, ...defaultSlides.slice(parsed.length)].slice(0, 10);
}

function safeFileName(value: string) {
  const name = value.replace(/[\\/:*?"<>|]/g, "_").trim() || "路演PPT";
  return `${name.replace(/\.pptx$/i, "")}.pptx`;
}

export async function buildPptxFile(input: PptxBuildInput): Promise<File> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const slides = parsePptSlideOutline(input.content);
  const sourceLabel = input.references?.length
    ? `参考资料：${input.references.slice(0, 3).map((item) => item.title).join("、")}`
    : "内容来源：平台当前项目上下文与课程预置结构";

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
