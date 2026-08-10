import { describe, expect, it } from "vitest";
import { answerModeInstructions, answerModes, normalizeAnswerMode } from "../../src/answerModes";

describe("answer modes", () => {
  it("只保留内容深度相关的三种回答方式", () => {
    expect(answerModes).toEqual(["Auto", "快速生成", "深度分析"]);
    expect(answerModes).not.toContain("多模态增强");
  });

  it("把历史多模态值安全归一为 Auto", () => {
    expect(normalizeAnswerMode("多模态增强")).toBe("Auto");
    expect(normalizeAnswerMode("快速生成")).toBe("快速生成");
    expect(normalizeAnswerMode(undefined)).toBe("Auto");
  });

  it("每种回答方式都有平台统一的提示词叠加规则", () => {
    answerModes.forEach((mode) => expect(answerModeInstructions[mode].length).toBeGreaterThan(10));
  });
});
