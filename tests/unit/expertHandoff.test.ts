import { describe, expect, it } from "vitest";
import {
  appendPositioningHandoffPrompt,
  createBrainstormArtifactContent,
  findLatestConfirmedStageArtifact,
  findLatestBrainstormHandoff,
  findLatestBrainstormHandoffCandidate,
  markBrainstormHandoffConfirmed,
  readArtifactBlocks,
  readBrainstormHandoff,
  readConfirmedStageArtifact,
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
    expect(appendPositioningHandoffPrompt("基础提示", markBrainstormHandoffConfirmed(handoff!))).toContain("已由学生确认交接");
    expect(appendPositioningHandoffPrompt("基础提示", handoff)).toContain("访谈 8 名学生");
  });

  it("用成果版本标识区分待确认交接，确认后再交给项目定位", () => {
    const content = createBrainstormArtifactContent({
      sourceMessageId: "message-versioned",
      ideaId: "idea-1",
      projectTitle: "AI 就业教练",
      projectDescription: "商学院学生训练平台",
      sourceSummary: "形成新一版方向",
      blocks,
    });
    const candidate = findLatestBrainstormHandoffCandidate([
      { id: "artifact-1", ideaId: "idea-1", artifactType: "BRAINSTORM", content, updatedAt: "2026-08-03T10:00:00Z" },
    ], "idea-1");

    expect(candidate?.artifact.id).toBe("artifact-1");
    expect(candidate?.handoff.reviewStatus).toBe("PENDING_STUDENT_CONFIRMATION");
    expect(markBrainstormHandoffConfirmed(candidate!.handoff).reviewStatus).toBe("CONFIRMED");
  });

  it("根据标题识别候选方向，不依赖结果块顺序", () => {
    const content = createBrainstormArtifactContent({
      sourceMessageId: "message-reordered",
      ideaId: "idea-1",
      projectTitle: "AI 就业教练",
      projectDescription: "商学院学生训练平台",
      sourceSummary: "结果块顺序已调整",
      blocks: [blocks[1], blocks[2], blocks[0]],
    });

    expect(content.handoff.ideaDirections).toEqual(["方向 A", "方向 B"]);
    expect(content.handoff.userAndProblemSignals).toEqual(["学生缺少连续训练", "教师反馈周期长"]);
  });

  it("读取任意专家确认后的正式阶段成果，供同一创意下其他专家引用", () => {
    const payload = {
      kind: "CONFIRMED_STAGE_ARTIFACT",
      schemaVersion: 1,
      sourceExpertId: "business",
      sourceMessageId: "message-bp",
      ideaId: "idea-1",
      artifactType: "BP",
      title: "AI 就业教练商业计划书",
      summary: "已确认当前 BP 版本",
      content: { blocks },
    };

    expect(readConfirmedStageArtifact(payload)).toMatchObject({
      sourceExpertId: "business",
      artifactType: "BP",
      ideaId: "idea-1",
    });
    expect(readConfirmedStageArtifact({ ...payload, ideaId: 1 })).toBeUndefined();
  });

  it("答辩按成果类型只读取当前创意的最新确认版本", () => {
    const payload = {
      kind: "CONFIRMED_STAGE_ARTIFACT" as const,
      schemaVersion: 1 as const,
      sourceExpertId: "business",
      ideaId: "idea-1",
      artifactType: "BP",
      title: "旧版商业计划书",
      summary: "旧确认版本",
      content: { blocks },
    };
    const handoffs = [
      {
        ideaId: "idea-1",
        targetExpertId: "ALL",
        status: "CONFIRMED",
        payload,
        confirmedAt: "2026-08-05T09:00:00Z",
      },
      {
        ideaId: "idea-2",
        targetExpertId: "ALL",
        status: "CONFIRMED",
        payload: { ...payload, ideaId: "idea-2", title: "其他创意版本" },
        confirmedAt: "2026-08-06T12:00:00Z",
      },
      {
        ideaId: "idea-1",
        targetExpertId: "ALL",
        status: "CONFIRMED",
        payload: { ...payload, title: "最新确认商业计划书", summary: "最新确认版本" },
        confirmedAt: "2026-08-06T10:00:00Z",
      },
      {
        ideaId: "idea-1",
        targetExpertId: "ALL",
        status: "PARSED",
        payload: { ...payload, title: "未确认版本" },
        confirmedAt: "2026-08-06T11:00:00Z",
      },
    ];

    const selected = findLatestConfirmedStageArtifact(handoffs, "idea-1", "BP", "defense");

    expect(selected?.artifact.title).toBe("最新确认商业计划书");
    expect(selected?.artifact.summary).toBe("最新确认版本");
    expect(selected?.handoff.confirmedAt).toBe("2026-08-06T10:00:00Z");
  });
});
