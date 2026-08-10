import { describe, expect, it } from "vitest";
import { readDefenseScore, selectIdeaDefenseMessages } from "../../src/defenseEvaluation";

describe("defenseEvaluation", () => {
  it("reads the total and weighted dimension scores returned by the AI evaluator", () => {
    const result = readDefenseScore([
      {
        title: "综合评分",
        items: [
          "总分：86/100",
          "项目逻辑：18/20",
          "用户与痛点：13/15",
          "商业模式：17/20",
          "市场与竞争：12/15",
          "证据可信度：17/20",
          "表达与应答：9/10",
        ],
      },
    ]);

    expect(result.total).toBe(86);
    expect(result.dimensions).toHaveLength(6);
    expect(result.dimensions[0]).toEqual({ name: "项目逻辑", score: 18, maximum: 20 });
  });

  it("calculates the total from dimensions when the provider omits only the total line", () => {
    const result = readDefenseScore([
      {
        title: "分项评分",
        items: ["项目逻辑：16/20", "用户与痛点：12/15", "商业模式：15/20", "市场与竞争：11/15", "证据可信度：15/20", "表达与应答：8/10"],
      },
    ]);

    expect(result.total).toBe(77);
  });

  it("does not invent a score when no numeric scoring evidence exists", () => {
    expect(readDefenseScore([{ title: "综合评价", items: ["回答有逻辑，但证据仍需补充。"] }]).total).toBeNull();
  });

  it("汇总同一创意的全部对话材料并排除其他创意", () => {
    const messages = [
      { id: "bp", ideaId: "idea-a", conversationId: "business", artifactType: "BP" },
      { id: "ppt", ideaId: "idea-a", conversationId: "pitch", artifactType: "PPT" },
      { id: "other", ideaId: "idea-b", conversationId: "business-b", artifactType: "BP" },
    ];

    expect(selectIdeaDefenseMessages(messages, "idea-a").map((message) => message.id)).toEqual(["bp", "ppt"]);
  });
});
