import { describe, expect, it } from "vitest";
import {
  appendPositioningHandoffPrompt,
  createBrainstormArtifactContent,
  findLatestBrainstormHandoff,
  readArtifactBlocks,
  readBrainstormHandoff,
} from "../../src/expertHandoff";

const blocks = [
  { title: "核心创意", items: ["方向 A", "方向 B"] },
  { title: "用户痛点", items: ["学生缺少连续训练", "教师反馈周期长"] },
  { title: "验证任务", items: ["访谈 8 名学生"] },
];

describe("专家阶段交接", () => {
  it("把头脑风暴成果保存为可追溯的结构化交接", () => {
    const content = createBrainstormArtifactContent({
      sourceMessageId: "message-1",
      ideaId: "idea-1",
      projectTitle: "AI 就业教练",
      projectDescription: "商学院学生训练平台",
      sourceSummary: "已形成两个候选方向",
      blocks,
      createdAt: "2026-07-20T10:00:00.000Z",
    });

    expect(readArtifactBlocks(content)).toEqual(blocks);
    expect(readBrainstormHandoff(content)).toMatchObject({
      sourceMessageId: "message-1",
      ideaDirections: ["方向 A", "方向 B"],
      userAndProblemSignals: ["学生缺少连续训练", "教师反馈周期长"],
      validationTasks: ["访谈 8 名学生"],
      reviewStatus: "PENDING_STUDENT_CONFIRMATION",
    });
  });

  it("项目定位只读取同一创意最新且结构合法的头脑风暴交接", () => {
    const older = createBrainstormArtifactContent({
      sourceMessageId: "old",
      ideaId: "idea-1",
      projectTitle: "旧方向",
      projectDescription: "旧说明",
      sourceSummary: "旧摘要",
      blocks,
      createdAt: "2026-07-20T09:00:00.000Z",
    });
    const latest = createBrainstormArtifactContent({
      sourceMessageId: "new",
      ideaId: "idea-1",
      projectTitle: "新方向",
      projectDescription: "新说明",
      sourceSummary: "新摘要",
      blocks,
      createdAt: "2026-07-20T10:00:00.000Z",
    });

    const handoff = findLatestBrainstormHandoff([
      { ideaId: "idea-1", artifactType: "BRAINSTORM", content: older, updatedAt: "2026-07-20T09:00:00.000Z" },
      { ideaId: "idea-2", artifactType: "BRAINSTORM", content: latest, updatedAt: "2026-07-20T11:00:00.000Z" },
      { ideaId: "idea-1", artifactType: "BRAINSTORM", content: latest, updatedAt: "2026-07-20T10:00:00.000Z" },
      { ideaId: "idea-1", artifactType: "BRAINSTORM", content: { handoff: { kind: "unknown" } }, updatedAt: "2026-07-20T12:00:00.000Z" },
    ], "idea-1");

    expect(handoff?.sourceMessageId).toBe("new");
    expect(appendPositioningHandoffPrompt("基础提示", handoff)).toContain("尚待学生确认");
    expect(appendPositioningHandoffPrompt("基础提示", handoff)).toContain("访谈 8 名学生");
  });
});
