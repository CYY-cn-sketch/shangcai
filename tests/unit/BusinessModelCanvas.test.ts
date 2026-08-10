import { describe, expect, it } from "vitest";
import { normalizeBusinessModelCanvas } from "../../src/businessModelCanvasModel";

describe("商业模式画布", () => {
  it("把专家结果归一为固定九个模块并兼容关键资源别名", () => {
    const canvas = normalizeBusinessModelCanvas([
      { title: "商业模式画布", items: ["客户细分：商学院学生", "关键资源：课程知识库", "收入来源：课程服务费"] },
      { title: "价值主张", items: ["形成可复盘的创业实践闭环"] },
    ]);

    expect(canvas).toHaveLength(9);
    expect(canvas.find((item) => item.label === "客户细分")?.items).toContain("商学院学生");
    expect(canvas.find((item) => item.label === "核心资源")?.items).toContain("课程知识库");
    expect(canvas.find((item) => item.label === "价值主张")?.items).toContain("形成可复盘的创业实践闭环");
  });

  it("只按字段前缀归类，不把正文关键词复制到其他模块", () => {
    const canvas = normalizeBusinessModelCanvas([
      {
        title: "商业模式画布",
        items: [
          "价值主张：提升学生成果质量、降低教师重复点评成本",
          "客户关系：通过课程渠道持续服务",
          "成本结构：平台研发维护与模型调用",
        ],
      },
    ]);

    expect(canvas.find((item) => item.label === "价值主张")?.items).toEqual([
      "提升学生成果质量、降低教师重复点评成本",
    ]);
    expect(canvas.find((item) => item.label === "客户关系")?.items).toEqual([
      "通过课程渠道持续服务",
    ]);
    expect(canvas.find((item) => item.label === "渠道通路")?.items).toEqual([]);
    expect(canvas.find((item) => item.label === "成本结构")?.items).toEqual([
      "平台研发维护与模型调用",
    ]);
  });
});
