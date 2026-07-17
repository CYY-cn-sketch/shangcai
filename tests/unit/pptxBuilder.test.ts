import { describe, expect, it } from "vitest";
import { buildPptxFile, parsePptSlideOutline } from "../../src/pptxBuilder";

describe("PPTX assembly", () => {
  it("turns provider-style outline text into ten normalized slides", () => {
    const slides = parsePptSlideOutline("第 1 页：课堂痛点｜学生缺少反馈｜使用对比图\n2. 解决方案｜形成教学闭环｜使用流程图");

    expect(slides).toHaveLength(10);
    expect(slides[0]).toEqual(["课堂痛点", "学生缺少反馈", "使用对比图"]);
    expect(slides[1]).toEqual(["解决方案", "形成教学闭环", "使用流程图"]);
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
