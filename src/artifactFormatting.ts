export type ArtifactBlock = { title: string; items: string[] };

const artifactTitles: Record<string, string> = {
  BRAINSTORM: "创意方向与验证任务清单",
  POSITIONING: "项目定位说明书",
  MARKET: "市场与竞争分析报告",
  BP: "商业计划书",
  PPT: "路演 PPT 内容大纲",
  SCRIPT: "路演讲稿",
  DEFENSE: "答辩模拟复盘报告",
  MEDIA: "多媒体物料制作方案",
};

export function getArtifactDocumentTitle(artifactType?: string, fallback = "AI 阶段成果") {
  return artifactType ? artifactTitles[artifactType] || fallback : fallback;
}

export function cleanArtifactText(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\|+|\|+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPreamble(value: string) {
  return /^(好的[，,。]|可以[，,。]|没问题[，,。]|我理解|下面(?:是|给出)|注意事项[：:]|说明[：:])/i.test(value);
}

export function parseArtifactBlocks(content: string, artifactType?: string): ArtifactBlock[] {
  const artifactMarker = "【阶段成果】";
  const markerIndex = content.indexOf(artifactMarker);
  let normalized = (markerIndex >= 0 ? content.slice(markerIndex + artifactMarker.length) : content)
    .replace(/\r\n?/g, "\n")
    .replace(/```(?:markdown)?/gi, "")
    .replace(/\s+(#{1,6}\s+)/g, "\n$1")
    .replace(/\s*\|\|\s*/g, "\n")
    .replace(/\s+[-–—]{3,}\s+/g, "\n")
    .trim();

  const formalMarker = normalized.lastIndexOf("【正式回复】");
  if (formalMarker >= 0) normalized = normalized.slice(formalMarker + "【正式回复】".length).trim();

  const blocks: ArtifactBlock[] = [];
  let title = getArtifactDocumentTitle(artifactType);
  let items: string[] = [];

  function commit() {
    const cleanItems = items.map(cleanArtifactText).filter((item) => item && !isPreamble(item));
    if (cleanItems.length) blocks.push({ title: cleanArtifactText(title), items: cleanItems });
    items = [];
  }

  normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[-–—]{3,}$/.test(line))
    .forEach((line) => {
      const heading =
        line.match(/^#{1,6}\s+(.+)$/) ||
        line.match(/^【([^】]+)】$/) ||
        line.match(/^\*\*([^*]{2,60})\*\*[：:]?$/);
      if (heading) {
        commit();
        title = heading[1];
        return;
      }
      if (/^\|?\s*:?-{2,}/.test(line)) return;
      const listItem = line.match(/^(?:[-*•]|(?:第)?[一二三四五六七八九十0-9]+[.)、])\s*(.+)$/);
      const tableCells = /^\|.*\|$/.test(line)
        ? line.split("|").map(cleanArtifactText).filter(Boolean)
        : [];
      if (tableCells.length) {
        items.push(tableCells.join("："));
        return;
      }
      items.push(listItem ? listItem[1] : line);
    });
  commit();
  return blocks;
}

export function normalizeArtifactBlocks(
  blocks: ArtifactBlock[] | undefined,
  content: string,
  artifactType?: string,
): ArtifactBlock[] {
  const hasGenericWrapper =
    blocks?.length === 1 &&
    /生成结果|阶段成果/.test(blocks[0].title) &&
    blocks[0].items.length === 1;
  if (!blocks?.length || hasGenericWrapper) {
    const source = hasGenericWrapper ? blocks[0].items[0] : content;
    const parsed = parseArtifactBlocks(source, artifactType);
    if (parsed.length) return parsed;
  }
  return (blocks || [])
    .map((block) => ({
      title: cleanArtifactText(block.title),
      items: block.items.map(cleanArtifactText).filter((item) => item && !isPreamble(item)),
    }))
    .filter((block) => block.title && block.items.length);
}
