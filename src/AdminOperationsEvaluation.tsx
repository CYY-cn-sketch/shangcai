import { useEffect, useRef, useState } from "react";
import { Database, FileSearch, RotateCcw, X } from "lucide-react";
import type {
  AdminOperationsEvaluationCard,
  AdminOperationsReport,
} from "./api/admin";
import "./AdminOperationsEvaluation.css";

type AdminOperationsEvaluationProps = {
  report: AdminOperationsReport | null;
  error: string;
  onRefresh: () => Promise<void> | void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "无起始时间限制";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatRange(card: AdminOperationsEvaluationCard) {
  if (!card.periodStart) return `全量数据，截至 ${formatDateTime(card.periodEnd)}`;
  return `${formatDateTime(card.periodStart)} 至 ${formatDateTime(card.periodEnd)}`;
}

function calculationText(card: AdminOperationsEvaluationCard) {
  if (card.numerator == null) return "不适用";
  if (card.denominator == null) return `计数：${card.numerator}`;
  return `分子 ${card.numerator} / 分母 ${card.denominator}`;
}

function SourceTags({ sources }: { sources: string[] }) {
  return (
    <span className="operations-source-tags" aria-label={`数据来源：${sources.join("、")}`}>
      {sources.map((source) => (
        <em key={source}>{source}</em>
      ))}
    </span>
  );
}

function EvaluationCardButton({
  card,
  variant,
  onOpen,
}: {
  card: AdminOperationsEvaluationCard;
  variant: "kpi" | "summary" | "review" | "evidence";
  onOpen: (card: AdminOperationsEvaluationCard) => void;
}) {
  return (
    <button
      className={`operations-evaluation-card is-${variant}`}
      type="button"
      onClick={() => onOpen(card)}
      aria-label={`查看${card.title}详情`}
    >
      <span className="operations-card-heading">
        <span>
          <strong>{card.value}</strong>
          <b>{card.title}</b>
        </span>
        <em>{card.badge}</em>
      </span>
      {card.zeroReason ? (
        <p className="operations-zero-reason">{card.zeroReason}</p>
      ) : (
        <p>{card.statements[0] || card.definition}</p>
      )}
      <SourceTags sources={card.sources} />
      <span className="operations-card-action">查看口径与明细</span>
    </button>
  );
}

function EvaluationDetailDialog({
  card,
  generatedAt,
  onClose,
}: {
  card: AdminOperationsEvaluationCard;
  generatedAt: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="operations-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="operations-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="operations-detail-title"
      >
        <header>
          <div>
            <span className="eyebrow">运营指标详情</span>
            <h3 id="operations-detail-title">{card.title}</h3>
            <p>{card.value} · {card.badge}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭运营指标详情">
            <X size={18} />
          </button>
        </header>

        <div className="operations-detail-body">
          {card.zeroReason && (
            <section className="operations-detail-zero" role="status">
              <strong>为什么当前为 0</strong>
              <p>{card.zeroReason}</p>
            </section>
          )}

          <dl className="operations-detail-meta">
            <div>
              <dt>指标定义</dt>
              <dd>{card.definition}</dd>
            </div>
            <div>
              <dt>分子 / 分母</dt>
              <dd>{calculationText(card)}</dd>
            </div>
            <div>
              <dt>统计时间范围</dt>
              <dd>{formatRange(card)}</dd>
            </div>
            <div>
              <dt>最近更新时间</dt>
              <dd>{formatDateTime(generatedAt)}</dd>
            </div>
            <div className="operations-detail-source-row">
              <dt>数据来源</dt>
              <dd><SourceTags sources={card.sources} /></dd>
            </div>
          </dl>

          <section className="operations-detail-section">
            <h4>规则结论</h4>
            <ul>
              {card.statements.map((statement) => <li key={statement}>{statement}</li>)}
            </ul>
          </section>

          <section className="operations-detail-section">
            <div className="operations-detail-section-heading">
              <h4>关联成果 / 小组 / 记录明细</h4>
              <span>{card.records.length} 条</span>
            </div>
            {card.records.length === 0 ? (
              <div className="operations-record-empty">
                <FileSearch size={20} />
                <div>
                  <strong>暂无关联记录</strong>
                  <p>{card.zeroReason || "当前没有符合该指标口径的可展示记录。"}</p>
                </div>
              </div>
            ) : (
              <div className="operations-record-list">
                {card.records.map((record) => (
                  <article key={`${record.kind}-${record.id}`}>
                    <header>
                      <span>{record.kind}</span>
                      {record.status && <em>{record.status}</em>}
                    </header>
                    <strong>{record.title}</strong>
                    <p>{record.detail}</p>
                    <footer>
                      <span>{record.groupLabel || "平台运行记录"}</span>
                      {record.occurredAt && <time>{formatDateTime(record.occurredAt)}</time>}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export function AdminOperationsEvaluation({ report, error, onRefresh }: AdminOperationsEvaluationProps) {
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const selectedCard = selectedCardKey && report
    ? [
        ...report.evaluation.kpis,
        ...report.evaluation.summaries,
        ...report.evaluation.reviews,
        ...report.evaluation.evidence,
      ].find((card) => card.key === selectedCardKey) || null
    : null;

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  if (!report) {
    return (
      <div className="operations-evaluation-state" role={error ? "alert" : "status"}>
        <Database size={24} />
        <div>
          <strong>{error ? "后端运营统计暂不可用" : "正在读取后端运营统计"}</strong>
          <p>{error || "页面只展示 MySQL 与后端运行记录，不使用前端快照兜底。"}</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          <RotateCcw size={15} /> {refreshing ? "刷新中" : "重新加载"}
        </button>
      </div>
    );
  }

  return (
    <div className="operations-evaluation-page">
      <section className={`operations-evaluation-source ${error ? "has-error" : ""}`} aria-label="运营评估数据来源">
        <div>
          <span className="eyebrow">真实数据统计</span>
          <strong>后端 AdminOperationsReport 为唯一统计真源</strong>
          <p>
            {error ? `最近一次刷新失败：${error}；当前展示上次成功结果。` : `生成时间：${formatDateTime(report.generatedAt)}`}
          </p>
          <SourceTags sources={report.evaluation.sourceCategories} />
        </div>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          <RotateCcw size={15} /> {refreshing ? "刷新中" : "手动刷新"}
        </button>
      </section>

      <section className="operations-evaluation-kpis" aria-label="试点运营核心指标">
        {report.evaluation.kpis.map((card) => (
          <EvaluationCardButton key={card.key} card={card} variant="kpi" onOpen={(current) => setSelectedCardKey(current.key)} />
        ))}
      </section>

      <section className="operations-summary-grid" aria-label="试点评估汇总">
        {report.evaluation.summaries.map((card) => (
          <EvaluationCardButton key={card.key} card={card} variant="summary" onOpen={(current) => setSelectedCardKey(current.key)} />
        ))}
      </section>

      <section className="operations-review-board">
        <header>
          <span className="eyebrow">运营复盘</span>
          <h3>有证据的阶段复盘</h3>
          <p>发现、风险与动作均由已保存记录通过固定规则聚合，不在页面加载或刷新时调用 AI。</p>
        </header>
        <div className="operations-review-grid">
          {report.evaluation.reviews.map((card) => (
            <EvaluationCardButton key={card.key} card={card} variant="review" onOpen={(current) => setSelectedCardKey(current.key)} />
          ))}
        </div>
        <div className="operations-evidence-grid" aria-label="评估证据汇总">
          {report.evaluation.evidence.map((card) => (
            <EvaluationCardButton key={card.key} card={card} variant="evidence" onOpen={(current) => setSelectedCardKey(current.key)} />
          ))}
        </div>
      </section>

      {selectedCard && (
        <EvaluationDetailDialog
          card={selectedCard}
          generatedAt={report.generatedAt}
          onClose={() => setSelectedCardKey(null)}
        />
      )}
    </div>
  );
}
