export type BusinessModelCanvasBlock = {
  title: string;
  items: string[];
};

export const businessModelCanvasSections = [
  { key: "partners", label: "关键合作伙伴", aliases: /合作伙伴|关键伙伴|合作方|伙伴/ },
  { key: "activities", label: "关键业务", aliases: /关键业务|核心业务|关键活动|核心活动/ },
  { key: "value", label: "价值主张", aliases: /价值主张|核心价值/ },
  { key: "relations", label: "客户关系", aliases: /客户关系|用户关系/ },
  { key: "segments", label: "客户细分", aliases: /客户细分|用户细分|目标客户|目标用户/ },
  { key: "resources", label: "核心资源", aliases: /核心资源|关键资源/ },
  { key: "channels", label: "渠道通路", aliases: /渠道通路|渠道|触达方式/ },
  { key: "costs", label: "成本结构", aliases: /成本结构|主要成本|成本/ },
  { key: "revenue", label: "收入来源", aliases: /收入来源|收入结构|收入|盈利模式/ },
] as const;

function matchesSectionTitle(value: string, labelPattern: RegExp) {
  return new RegExp(`^\\s*(?:${labelPattern.source})\\s*$`, "i").test(value);
}

function readPrefixedItem(value: string, labelPattern: RegExp) {
  const prefix = value.match(new RegExp(`^\\s*(?:${labelPattern.source})\\s*[：:]\\s*`, "i"));
  return prefix ? value.slice(prefix[0].length).trim() : null;
}

export function normalizeBusinessModelCanvas(blocks: BusinessModelCanvasBlock[]) {
  return businessModelCanvasSections.map((section) => {
    const items: string[] = [];
    blocks.forEach((block) => {
      if (matchesSectionTitle(block.title, section.aliases)) {
        items.push(...block.items.map((item) => readPrefixedItem(item, section.aliases) ?? item));
        return;
      }
      block.items.forEach((item) => {
        const prefixedItem = readPrefixedItem(item, section.aliases);
        if (prefixedItem !== null) items.push(prefixedItem);
      });
    });
    return {
      ...section,
      items: Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 8),
    };
  });
}
