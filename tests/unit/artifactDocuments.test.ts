import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildArtifactDocx } from "../../src/artifactDocuments";

describe("artifactDocuments", () => {
  it("creates a real Office Open XML Word file", async () => {
    const blob = await buildArtifactDocx("商业计划书", [
      { title: "执行摘要", items: ["面向创业实践课程提供阶段成果生成、教师审核与沉淀闭环。"] },
      { title: "商业模式", items: ["以课程试点包验证采购价值，价格与续费条件待验证。"] },
    ]);

    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(blob.size).toBeGreaterThan(1_000);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const archive = await JSZip.loadAsync(bytes);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
      "word/styles.xml",
    ]));
    const contentTypes = await archive.file("[Content_Types].xml")?.async("string");
    const documentXml = await archive.file("word/document.xml")?.async("string");
    expect(contentTypes).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml");
    expect(documentXml).toContain("商业计划书");
    expect(documentXml).toContain("执行摘要");
  });
});
