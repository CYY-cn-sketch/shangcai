export const answerModes = ["Auto", "快速生成", "深度分析"] as const;

export type AnswerMode = (typeof answerModes)[number];

export const answerModeLabels: Record<AnswerMode, string> = {
  Auto: "Auto（自动）",
  快速生成: "快速生成",
  深度分析: "深度分析",
};

export const answerModeInstructions: Record<AnswerMode, string> = {
  Auto: "根据输入完整度和当前创业阶段自动选择简版或深度版，优先保证结果完整且便于继续推进。",
  快速生成: "压缩分析过程，只保留最关键的 3—4 条结论和下一步动作，便于课堂快速讨论。",
  深度分析: "补充判断依据、证据缺口、风险边界、教师审核口径和下一轮验证任务。",
};

export function normalizeAnswerMode(value: string | null | undefined): AnswerMode {
  return value === "快速生成" || value === "深度分析" ? value : "Auto";
}
