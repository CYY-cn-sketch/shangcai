import { describe, expect, it } from "vitest";
import { buildPptOutlineContent, buildPptxFile, parsePptSlideOutline } from "../../src/pptxBuilder";

describe("PPTX assembly", () => {
  it("preserves the actual number of provider slides instead of padding to ten", () => {
    const slides = parsePptSlideOutline("第 1 页：课堂痛点｜学生缺少反馈｜使用对比图\n2. 解决方案｜形成教学闭环｜使用流程图");

    expect(slides).toHaveLength(2);
    expect(slides[0]).toEqual(["课堂痛点", "学生缺少反馈", "使用对比图"]);
    expect(slides[1]).toEqual(["解决方案", "形成教学闭环", "使用流程图"]);
  });

  it("turns DeepSeek artifact blocks into a dynamic slide outline", () => {
    const content = buildPptOutlineContent([
      { title: "项目愿景", items: ["让实践过程可追踪", "教学闭环图"] },
      { title: "验证结果", items: ["展示当前已确认的证据", "指标对比表"] },
      { title: "下一步", items: ["推进课程试点", "里程碑路线图"] },
    ]);

    expect(parsePptSlideOutline(content)).toHaveLength(3);
  });

  it("does not fabricate a preset deck when no slide outline exists", async () => {
    expect(parsePptSlideOutline("普通的一段说明文字")).toEqual([]);
    await expect(buildPptxFile({ title: "空白成果", content: "普通的一段说明文字" }))
      .rejects.toThrow("没有可识别的逐页 PPT 结构");
  });

  it("builds a real PPTX file without a provider call", async () => {
    const file = await buildPptxFile({
      title: "创业实践课程路演",
      content: "第 1 页：项目愿景｜连接学生生成与教师审核｜教学闭环图",
      references: [{ title: "课程教学大纲" }],
    });

    expect(file.name).toBe("创业实践课程路演.pptx");
    expect(file.type).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(file.size).toBeGreaterThan(10_000);
  });
});
