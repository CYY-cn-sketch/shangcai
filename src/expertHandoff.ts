export type ExpertHandoffBlock = {
  title: string;
  items: string[];
};

export type BrainstormToPositioningHandoff = {
  kind: "BRAINSTORM_TO_POSITIONING";
  schemaVersion: 1;
  sourceExpertId: "brainstorm";
  targetExpertId: "positioning";
  sourceMessageId: string;
  ideaId: string;
  projectTitle: string;
  projectDescription: string;
  sourceSummary: string;
  ideaDirections: string[];
  userAndProblemSignals: string[];
  validationTasks: string[];
  reviewStatus: "PENDING_STUDENT_CONFIRMATION";
  createdAt: string;
};

export type BrainstormArtifactContent = {
  kind: "EXPERT_STAGE_RESULT";
  schemaVersion: 1;
  blocks: ExpertHandoffBlock[];
  handoff: BrainstormToPositioningHandoff;
};

type ArtifactLike = {
  ideaId: string;
  artifactType: string;
  content: unknown;
  updatedAt?: string;
  createdAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validBlocks(value: unknown): ExpertHandoffBlock[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const blocks = value.filter(
    (item): item is ExpertHandoffBlock =>
      isRecord(item) &&
      typeof item.title === "string" &&
      Array.isArray(item.items) &&
      item.items.every((entry) => typeof entry === "string"),
  );
  return blocks.length ? blocks : undefined;
}

export function readArtifactBlocks(value: unknown): ExpertHandoffBlock[] | undefined {
  if (Array.isArray(value)) return validBlocks(value);
  if (!isRecord(value)) return undefined;
  return validBlocks(value.blocks);
}

function collectItems(blocks: ExpertHandoffBlock[], titlePattern: RegExp) {
  return blocks
    .filter((block) => titlePattern.test(block.title))
    .flatMap((block) => block.items)
    .filter((item, index, items) => item.trim() && items.indexOf(item) === index)
    .slice(0, 12);
}

export function createBrainstormArtifactContent(input: {
  sourceMessageId: string;
  ideaId: string;
  projectTitle: string;
  projectDescription: string;
  sourceSummary: string;
  blocks: ExpertHandoffBlock[];
  createdAt?: string;
}): BrainstormArtifactContent {
  const userAndProblemSignals = collectItems(input.blocks, /用户|痛点|问题|需求/);
  const validationTasks = collectItems(input.blocks, /验证|任务|行动|下一步/);
  return {
    kind: "EXPERT_STAGE_RESULT",
    schemaVersion: 1,
    blocks: input.blocks,
    handoff: {
      kind: "BRAINSTORM_TO_POSITIONING",
      schemaVersion: 1,
      sourceExpertId: "brainstorm",
      targetExpertId: "positioning",
      sourceMessageId: input.sourceMessageId,
      ideaId: input.ideaId,
      projectTitle: input.projectTitle,
      projectDescription: input.projectDescription,
      sourceSummary: input.sourceSummary,
      ideaDirections: input.blocks[0]?.items.slice(0, 8) || [],
      userAndProblemSignals,
      validationTasks,
      reviewStatus: "PENDING_STUDENT_CONFIRMATION",
      createdAt: input.createdAt || new Date().toISOString(),
    },
  };
}

export function readBrainstormHandoff(value: unknown): BrainstormToPositioningHandoff | undefined {
  if (!isRecord(value) || !isRecord(value.handoff)) return undefined;
  const handoff = value.handoff;
  if (
    handoff.kind !== "BRAINSTORM_TO_POSITIONING" ||
    handoff.schemaVersion !== 1 ||
    handoff.sourceExpertId !== "brainstorm" ||
    handoff.targetExpertId !== "positioning" ||
    typeof handoff.sourceMessageId !== "string" ||
    typeof handoff.ideaId !== "string" ||
    typeof handoff.projectTitle !== "string" ||
    typeof handoff.projectDescription !== "string" ||
    typeof handoff.sourceSummary !== "string" ||
    !Array.isArray(handoff.ideaDirections) ||
    !handoff.ideaDirections.every((item) => typeof item === "string") ||
    !Array.isArray(handoff.userAndProblemSignals) ||
    !handoff.userAndProblemSignals.every((item) => typeof item === "string") ||
    !Array.isArray(handoff.validationTasks) ||
    !handoff.validationTasks.every((item) => typeof item === "string") ||
    handoff.reviewStatus !== "PENDING_STUDENT_CONFIRMATION" ||
    typeof handoff.createdAt !== "string"
  ) {
    return undefined;
  }
  return handoff as BrainstormToPositioningHandoff;
}

export function findLatestBrainstormHandoff(artifacts: ArtifactLike[], ideaId: string) {
  return artifacts
    .filter((artifact) => artifact.ideaId === ideaId && artifact.artifactType === "BRAINSTORM")
    .sort((left, right) => (right.updatedAt || right.createdAt || "").localeCompare(left.updatedAt || left.createdAt || ""))
    .map((artifact) => readBrainstormHandoff(artifact.content))
    .find((handoff): handoff is BrainstormToPositioningHandoff => Boolean(handoff));
}

function formatItems(items: string[], emptyText: string) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

export function appendPositioningHandoffPrompt(basePrompt: string, handoff?: BrainstormToPositioningHandoff) {
  if (!handoff) return basePrompt;
  return `${basePrompt}

【上一阶段：头脑风暴结构化交接】
项目：${handoff.projectTitle}
项目说明：${handoff.projectDescription}
阶段摘要：${handoff.sourceSummary}

候选方向：
${formatItems(handoff.ideaDirections, "上一阶段未形成明确方向")}

用户与问题信号：
${formatItems(handoff.userAndProblemSignals, "上一阶段未形成明确用户或问题信号")}

待验证任务：
${formatItems(handoff.validationTasks, "上一阶段未形成验证任务")}

注意：以上内容尚待学生确认。请先让学生确认、删改或补充，再据此收敛第一用户、核心问题、价值主张和差异化；不得把假设表述成已验证事实。`;
}
