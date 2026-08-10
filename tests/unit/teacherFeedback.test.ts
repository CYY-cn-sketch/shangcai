import { describe, expect, it } from "vitest";
import { findFeedbackSourceConversationId, selectIdeaFeedbackSubmissions } from "../../src/teacherFeedback";

describe("学生端教师反馈归属", () => {
  it("按 ideaId 聚合全部阶段和全部提交，不按 conversationId 分割且不混入其他创意", () => {
    const submissions = [
      {
        id: "idea-a-brainstorm-old",
        ideaId: "idea-a",
        conversationId: "conversation-a-1",
        artifactType: "BRAINSTORM",
        teacherComment: "第一轮创意反馈",
      },
      {
        id: "idea-a-ppt-new",
        ideaId: "idea-a",
        submissionVersion: 2,
        conversationId: "conversation-a-2",
        artifactType: "PPT",
        teacherComment: "第二轮路演反馈",
      },
      {
        id: "idea-a-ppt-history",
        ideaId: "idea-a",
        submissionVersion: 1,
        conversationId: "conversation-a-1",
        artifactType: "PPT",
        teacherComment: "历史 PPT 反馈",
      },
      {
        id: "idea-b-market",
        ideaId: "idea-b",
        conversationId: "conversation-b-1",
        artifactType: "MARKET",
        teacherComment: "另一个创意的反馈",
      },
    ];

    const selected = selectIdeaFeedbackSubmissions(submissions, "idea-a");

    expect(selected.map((submission) => submission.id)).toEqual([
      "idea-a-brainstorm-old",
      "idea-a-ppt-new",
      "idea-a-ppt-history",
    ]);
    expect(selected.map((submission) => submission.teacherComment)).toEqual([
      "第一轮创意反馈",
      "第二轮路演反馈",
      "历史 PPT 反馈",
    ]);
    expect(new Set(selected.map((submission) => submission.conversationId))).toEqual(
      new Set(["conversation-a-1", "conversation-a-2"]),
    );
    expect(selected.filter((submission) => submission.artifactType === "PPT").map((submission) => submission.submissionVersion))
      .toEqual([2, 1]);
  });

  it("通过服务端消息 ID 或客户端消息 ID 恢复反馈成果的来源对话", () => {
    const messages = [
      { id: "server-a", clientMessageId: "client-a", conversationId: "conversation-a" },
      { id: "server-b", clientMessageId: "client-b", conversationId: "conversation-b" },
    ];

    expect(findFeedbackSourceConversationId(messages, "server-a")).toBe("conversation-a");
    expect(findFeedbackSourceConversationId(messages, "client-b")).toBe("conversation-b");
    expect(findFeedbackSourceConversationId(messages, "missing")).toBeUndefined();
  });
});
