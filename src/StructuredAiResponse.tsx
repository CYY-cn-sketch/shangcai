import { CheckCircle2, Compass } from "lucide-react";
import "./StructuredAiResponse.css";

type ParsedSection = {
  title?: string;
  paragraphs: string[];
  items: string[];
};

function cleanInline(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-–—]{3,}\s*$/, "")
    .trim();
}

function splitAnswer(content: string) {
  const normalized = content.replace(/\r\n?/g, "\n").trim();
  const summaryMarker = normalized.match(/【处理摘要】/);
  const answerMarker = normalized.match(/【正式回复】/);
  if (!summaryMarker || !answerMarker || answerMarker.index === undefined || summaryMarker.index === undefined) {
    return { summary: "", answer: normalized };
  }
  return {
    summary: normalized.slice(summaryMarker.index + summaryMarker[0].length, answerMarker.index).trim(),
    answer: normalized.slice(answerMarker.index + answerMarker[0].length).trim(),
  };
}

function parseSections(content: string): ParsedSection[] {
  const lines = content
    .replace(/\r\n?/g, "\n")
    .replace(/\s+(#{1,6}\s+)/g, "\n$1")
    .replace(/\s+[-–—]{3,}\s+/g, "\n")
    .replace(/\s*\|\|\s*/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[-–—]{3,}$/.test(line));
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { paragraphs: [], items: [] };

  function commit() {
    if (current.title || current.paragraphs.length || current.items.length) sections.push(current);
    current = { paragraphs: [], items: [] };
  }

  lines.forEach((line) => {
    const heading = line.match(/^#{1,6}\s+(.+)$/) || line.match(/^\d+[、.]\s*(.{2,24})$/);
    if (heading) {
      commit();
      current.title = cleanInline(heading[1]);
      return;
    }
    const item = line.match(/^(?:[-*•]|\d+[.)、])\s+(.+)$/);
    if (item) {
      current.items.push(cleanInline(item[1]));
      return;
    }
    if (/^\|.*\|$/.test(line)) {
      const cells = line.split("|").map(cleanInline).filter(Boolean);
      if (cells.length && !cells.every((cell) => /^:?-{2,}:?$/.test(cell))) {
        current.items.push(cells.join("："));
      }
      return;
    }
    const cleaned = cleanInline(line);
    if (cleaned) current.paragraphs.push(cleaned);
  });
  commit();
  return sections.length ? sections : [{ paragraphs: [cleanInline(content)], items: [] }];
}

function ResponseBody({ content }: { content: string }) {
  const sections = parseSections(content);
  return (
    <div className="structured-ai-sections">
      {sections.map((section, index) => (
        <section key={`${section.title || "section"}-${index}`}>
          {section.title && <h5>{section.title}</h5>}
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={`${paragraph.slice(0, 24)}-${paragraphIndex}`}>{paragraph}</p>
          ))}
          {section.items.length > 0 && (
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={`${item.slice(0, 24)}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function StructuredAiResponse({ content, compact = false }: { content: string; compact?: boolean }) {
  const answer = splitAnswer(content);
  return (
    <div className={`structured-ai-response ${compact ? "is-compact" : ""}`.trim()}>
      {answer.summary && (
        <section className="structured-ai-summary" aria-label="处理摘要">
          <header>
            <Compass size={16} aria-hidden="true" />
            <h4>处理摘要</h4>
            <span>面向用户的判断摘要，不展示内部思维链</span>
          </header>
          <ResponseBody content={answer.summary} />
        </section>
      )}
      <section className="structured-ai-answer" aria-label="正式回复">
        <header>
          <CheckCircle2 size={16} aria-hidden="true" />
          <h4>{answer.summary ? "正式回复" : "专家回复"}</h4>
        </header>
        <ResponseBody content={answer.answer} />
      </section>
    </div>
  );
}
