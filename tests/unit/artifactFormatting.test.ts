import { describe, expect, it } from "vitest";
import {
  getArtifactDocumentTitle,
  normalizeArtifactBlocks,
  parseArtifactBlocks,
} from "../../src/artifactFormatting";

describe("artifactFormatting", () => {
  it("uses a dedicated document title for each expert artifact", () => {
    expect(getArtifactDocumentTitle("BP")).toBe("商业计划书");
    expect(getArtifactDocumentTitle("POSITIONING")).toBe("项目定位说明书");
    expect(getArtifactDocumentTitle("DEFENSE")).toBe("答辩模拟复盘报告");
  });

  it("separates the formal artifact from chat preambles and markdown noise", () => {
    const blocks = parseArtifactBlocks(
      `【处理摘要】\n已读取当前项目。\n【正式回复】\nBP 已整理，请继续补充证据。\n【阶段成果】\n## 执行摘要\n- 面向商学院创业实践课程提供阶段成果闭环。\n## 商业模式\n- 首期采用课程试点包，价格待验证。`,
      "BP",
    );

    expect(blocks).toEqual([
      { title: "执行摘要", items: ["面向商学院创业实践课程提供阶段成果闭环。"] },
      { title: "商业模式", items: ["首期采用课程试点包，价格待验证。"] },
    ]);
  });

  it("repairs old generic expert-result wrappers instead of exporting a chat dump", () => {
    const blocks = normalizeArtifactBlocks(
      [{ title: "商业模式/BP 专家生成结果", items: ["## 执行摘要\n- 项目解决课堂成果缺少连续反馈的问题。"] }],
      "",
      "BP",
    );

    expect(blocks).toEqual([
      { title: "执行摘要", items: ["项目解决课堂成果缺少连续反馈的问题。"] },
    ]);
  });

  it("preserves pure numbered lists as artifact items", () => {
    const blocks = parseArtifactBlocks(
      "【阶段成果】\n1. 用户痛点：学生缺少持续反馈\n2、解决方案：提供阶段专家\n三、验证任务：完成教师访谈",
      "BP",
    );

    expect(blocks).toEqual([
      {
        title: "商业计划书",
        items: [
          "用户痛点：学生缺少持续反馈",
          "解决方案：提供阶段专家",
          "验证任务：完成教师访谈",
        ],
      },
    ]);
  });
});
