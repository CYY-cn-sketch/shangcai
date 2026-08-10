import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import {
  getAdminAiUsage,
  type AdminAiUsageReport,
  type AiUsageProvider,
  type AiUsageRange,
} from "./api/admin";
import "./AdminAiUsagePanel.css";

type UsageDimension = "users" | "groups";

const ranges: Array<{ value: AiUsageRange; label: string }> = [
  { value: "LAST_7_DAYS", label: "近 7 天" },
  { value: "LAST_30_DAYS", label: "近 30 天" },
  { value: "LAST_90_DAYS", label: "近 90 天" },
  { value: "ALL", label: "全部时间" },
];

const providerLabels: Record<AiUsageProvider, string> = {
  DEEPSEEK: "DeepSeek",
  LEXIANG: "乐享",
  WORKBUDDY: "WorkBuddy",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无使用";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatProviders(providers: AiUsageProvider[]) {
  return providers.map((provider) => providerLabels[provider]).join(" / ") || "未使用";
}

export function AdminAiUsagePanel() {
  const [dimension, setDimension] = useState<UsageDimension>("users");
  const [range, setRange] = useState<AiUsageRange>("LAST_30_DAYS");
  const [report, setReport] = useState<AdminAiUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setReport(await getAdminAiUsage(range));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 用量读取失败");
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    let active = true;
    getAdminAiUsage(range)
      .then((nextReport) => {
        if (active) setReport(nextReport);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "AI 用量读取失败");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const summary = report?.summary;
  const rows = dimension === "users" ? report?.users : report?.groups;

  return (
    <div className="admin-page ai-usage-page" key="admin-ai-usage">
      <section className="admin-resource-section ai-usage-section" aria-labelledby="ai-usage-title">
        <div className="ai-usage-toolbar">
          <div>
            <h4 id="ai-usage-title">AI 与生成服务用量</h4>
            <p>Token 是模型计量单位，不等同于汉字数；仅采用供应商返回值。乐享 PPT 和 WorkBuddy 视频按真实请求任务计数。</p>
          </div>
          <div className="ai-usage-controls">
            <div className="ai-usage-segmented" role="group" aria-label="统计维度">
              <button type="button" aria-pressed={dimension === "users"} onClick={() => setDimension("users")}>
                按个人
              </button>
              <button type="button" aria-pressed={dimension === "groups"} onClick={() => setDimension("groups")}>
                按小组
              </button>
            </div>
            <label className="ai-usage-range" htmlFor="ai-usage-range">
              <span>统计周期</span>
              <select
                id="ai-usage-range"
                value={range}
                onChange={(event) => {
                  setIsLoading(true);
                  setError(null);
                  setRange(event.target.value as AiUsageRange);
                }}
              >
                {ranges.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="ghost-button ai-usage-refresh" type="button" onClick={() => void loadUsage()} disabled={isLoading}>
              <RefreshCw size={16} aria-hidden="true" />
              {isLoading ? "读取中" : "刷新"}
            </button>
          </div>
        </div>

        <dl className="ai-usage-summary" aria-label="Token 用量汇总" aria-busy={isLoading}>
          <div>
            <dt>总 Token</dt>
            <dd><strong>{formatNumber(summary?.totalTokens ?? 0)}</strong><span>Token</span></dd>
          </div>
          <div>
            <dt>输入 Token</dt>
            <dd><strong>{formatNumber(summary?.inputTokens ?? 0)}</strong><span>Token</span></dd>
          </div>
          <div>
            <dt>输出 Token</dt>
            <dd><strong>{formatNumber(summary?.outputTokens ?? 0)}</strong><span>Token</span></dd>
          </div>
          <div>
            <dt>调用次数</dt>
            <dd><strong>{formatNumber(summary?.callCount ?? 0)}</strong><span>次</span></dd>
          </div>
          <div>
            <dt>使用人数</dt>
            <dd><strong>{formatNumber(summary?.activeUserCount ?? 0)}</strong><span>人</span></dd>
          </div>
          <div>
            <dt>涉及小组</dt>
            <dd><strong>{formatNumber(summary?.activeGroupCount ?? 0)}</strong><span>组</span></dd>
          </div>
        </dl>

        <dl className="provider-usage-summary" aria-label="供应商调用汇总">
          <div>
            <dt>DeepSeek 对话</dt>
            <dd>{formatNumber(summary?.deepSeekCalls ?? 0)} 次</dd>
          </div>
          <div>
            <dt>乐享 PPT</dt>
            <dd>{formatNumber(summary?.lexiangPptCalls ?? 0)} 次</dd>
          </div>
          <div>
            <dt>WorkBuddy 视频</dt>
            <dd>{formatNumber(summary?.workBuddyVideoJobs ?? 0)} 个任务</dd>
            <small>已完成 {formatNumber(summary?.workBuddyVideoCompleted ?? 0)} 个</small>
          </div>
        </dl>

        {error && (
          <div className="ai-usage-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void loadUsage()}>
              重新加载
            </button>
          </div>
        )}

        {!error && (
          <div className={`account-table ai-usage-table ai-usage-${dimension}-table`} aria-live="polite" aria-busy={isLoading}>
            {dimension === "users" ? (
              <>
                <div className="table-row table-head">
                  <span>使用人</span>
                  <span>所属小组</span>
                  <span>供应商</span>
                  <span>调用次数</span>
                  <span>输入 Token</span>
                  <span>输出 Token</span>
                  <span>总 Token</span>
                  <span>最近使用</span>
                </div>
                {report?.users.map((item) => (
                  <article className="table-row" key={item.userId}>
                    <span><strong>{item.displayName}</strong></span>
                    <span title={item.groupName}>{item.groupLabel ? `${item.groupLabel} · ${item.groupName}` : "未分组"}</span>
                    <span>{formatProviders(item.providers)}</span>
                    <span>{formatNumber(item.callCount)}</span>
                    <span>{formatNumber(item.inputTokens)}</span>
                    <span>{formatNumber(item.outputTokens)}</span>
                    <span><strong>{formatNumber(item.totalTokens)}</strong></span>
                    <span>{formatDateTime(item.lastUsedAt)}</span>
                  </article>
                ))}
              </>
            ) : (
              <>
                <div className="table-row table-head">
                  <span>项目小组</span>
                  <span>使用人数</span>
                  <span>供应商</span>
                  <span>调用次数</span>
                  <span>输入 Token</span>
                  <span>输出 Token</span>
                  <span>总 Token</span>
                  <span>最近使用</span>
                </div>
                {report?.groups.map((item) => (
                  <article className="table-row" key={item.groupId}>
                    <span title={item.groupName}>
                      <strong>{item.groupLabel}</strong>
                      <small>{item.groupName}</small>
                    </span>
                    <span>{formatNumber(item.memberCount)}</span>
                    <span>{formatProviders(item.providers)}</span>
                    <span>{formatNumber(item.callCount)}</span>
                    <span>{formatNumber(item.inputTokens)}</span>
                    <span>{formatNumber(item.outputTokens)}</span>
                    <span><strong>{formatNumber(item.totalTokens)}</strong></span>
                    <span>{formatDateTime(item.lastUsedAt)}</span>
                  </article>
                ))}
              </>
            )}

            {!isLoading && (rows?.length ?? 0) === 0 && (
              <div className="ai-usage-empty" role="status">
                <BarChart3 size={26} aria-hidden="true" />
                <strong>{dimension === "groups" ? "尚未创建项目小组" : "暂无真实 Token 用量"}</strong>
                <span>
                  {dimension === "groups"
                    ? "请先在账号与权限管理中创建项目小组。"
                    : "等待供应商返回可核验的输入与输出 Token 后再统计。"}
                </span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
