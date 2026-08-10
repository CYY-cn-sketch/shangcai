import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Header,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { cleanArtifactText, type ArtifactBlock } from "./artifactFormatting";

export function createArtifactDocument(title: string, blocks: ArtifactBlock[]) {
  const safeBlocks = blocks.length
    ? blocks
    : [{ title: "内容说明", items: ["当前没有可导出的结构化阶段成果，请先完成专家生成。"] }];
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "上海财经大学商学院 AI 赋能创业实践教学示范平台", color: "60738B", size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 420 },
      border: { bottom: { style: BorderStyle.SINGLE, color: "C59A3A", size: 10, space: 8 } },
    }),
  ];

  safeBlocks.forEach((block) => {
    children.push(
      new Paragraph({
        text: cleanArtifactText(block.title),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 260, after: 120 },
      }),
    );
    block.items.forEach((item) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: cleanArtifactText(item), size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 100, line: 360 },
        }),
      );
    });
  });

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "本文件由平台根据当前项目资料与专家阶段成果生成，事实、数据和结论仍需学生补充证据并经教师审核。",
          color: "6F8096",
          italics: true,
          size: 18,
        }),
      ],
      spacing: { before: 420 },
      border: { top: { style: BorderStyle.SINGLE, color: "D8E2ED", size: 4, space: 8 } },
    }),
  );

  return new Document({
    creator: "上海财经大学商学院 AI 赋能创业实践教学示范平台",
    title,
    description: "学生阶段成果",
    styles: {
      default: {
        document: {
          run: { font: "Microsoft YaHei", size: 22, color: "142A45" },
          paragraph: { spacing: { line: 360 } },
        },
        title: { run: { font: "Microsoft YaHei", size: 40, bold: true, color: "003B79" } },
        heading1: { run: { font: "Microsoft YaHei", size: 28, bold: true, color: "003B79" } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "SUFE · 创业实践阶段成果", color: "70839A", size: 17 })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export async function buildArtifactDocx(title: string, blocks: ArtifactBlock[]) {
  return Packer.toBlob(createArtifactDocument(title, blocks));
}
