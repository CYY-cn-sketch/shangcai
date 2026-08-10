export type DefenseEvaluationBlock = {
  title: string;
  items: string[];
};

export type DefenseDimensionScore = {
  name: string;
  score: number;
  maximum: number;
};

export type DefenseScoreSummary = {
  total: number | null;
  dimensions: DefenseDimensionScore[];
};

export function selectIdeaDefenseMessages<T extends { ideaId: string }>(messages: T[], ideaId: string) {
  return messages.filter((message) => message.ideaId === ideaId);
}

const TOTAL_SCORE_PATTERN = /(?:总分|综合得分|综合评分|本轮得分)[^0-9]{0,10}(\d{1,3}(?:\.\d+)?)\s*(?:\/\s*100|分)/;
const SCORE_OUT_OF_100_PATTERN = /(\d{1,3}(?:\.\d+)?)\s*\/\s*100/;
const DIMENSION_SCORE_PATTERN = /^(.{2,24}?)(?:[：:]|\s)\s*(\d{1,3}(?:\.\d+)?)\s*\/\s*(\d{1,3}(?:\.\d+)?)(?:\s|$|[：:，,。；;])/;

function clampScore(value: number, maximum: number) {
  return Math.min(maximum, Math.max(0, Math.round(value * 10) / 10));
}

function cleanDimensionName(value: string) {
  return value.replace(/^[—–•\d.、)）\s-]+/, "").trim();
}

export function formatDefenseScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function readDefenseScore(blocks: DefenseEvaluationBlock[]): DefenseScoreSummary {
  const texts = blocks.flatMap((block) => [block.title, ...block.items]);
  const dimensions: DefenseDimensionScore[] = [];
  const seenNames = new Set<string>();

  for (const text of texts) {
    const match = text.match(DIMENSION_SCORE_PATTERN);
    if (!match) continue;
    const name = cleanDimensionName(match[1]);
    const score = Number(match[2]);
    const maximum = Number(match[3]);
    if (!name || /总分|综合得分|综合评分|本轮得分/.test(name) || !Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || maximum >= 100) continue;
    const key = name.toLocaleLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    dimensions.push({ name, score: clampScore(score, maximum), maximum });
  }

  const directTotal = texts
    .map((text) => text.match(TOTAL_SCORE_PATTERN)?.[1])
    .find(Boolean);
  const fallbackTotal = blocks
    .filter((block) => /评分|得分/.test(block.title))
    .flatMap((block) => block.items)
    .map((text) => text.match(SCORE_OUT_OF_100_PATTERN)?.[1])
    .find(Boolean);
  let total = Number(directTotal || fallbackTotal);
  if (!Number.isFinite(total)) {
    const maximum = dimensions.reduce((sum, item) => sum + item.maximum, 0);
    total = maximum === 100 ? dimensions.reduce((sum, item) => sum + item.score, 0) : Number.NaN;
  }

  return {
    total: Number.isFinite(total) ? clampScore(total, 100) : null,
    dimensions,
  };
}

export function getDefenseScoreLabel(blocks: DefenseEvaluationBlock[]) {
  const total = readDefenseScore(blocks).total;
  return total === null ? null : `${formatDefenseScore(total)}/100`;
}

export function isDefenseScoreBlock(block: DefenseEvaluationBlock) {
  return /综合评分|本轮评分|评分明细|分项评分/.test(block.title);
}
