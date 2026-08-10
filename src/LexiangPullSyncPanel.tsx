import { RefreshCw } from "lucide-react";
import type { LexiangPullRunRecord } from "./api/knowledge";

const statusLabels: Record<string, string> = {
  NOT_CONFIGURED: "未配置",
  PENDING: "等待执行",
  RUNNING: "同步中",
  SUCCESS: "同步成功",
  SUCCEEDED: "同步成功",
  COMPLETED: "同步完成",
  PARTIAL: "部分完成",
  FAILED: "同步失败",
};

const activeStatuses = new Set(["PENDING", "RUNNING"]);

function formatRunTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getStatusTone(status: string) {
  if (["SUCCESS", "SUCCEEDED", "COMPLETED"].includes(status)) return "success";
  if (["FAILED", "PARTIAL"].includes(status)) return "warning";
  return "neutral";
}

export function LexiangPullSyncPanel(props: {
  scopeType: "COURSE_SHARED" | "EXPERT_PRIVATE";
  run: LexiangPullRunRecord | null;
  configured: boolean;
  configurationMessage?: string;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  onSync: () => void | Promise<void>;
}) {
  if (props.scopeType !== "COURSE_SHARED") return null;

  const configured = props.configured && props.run?.configured !== false && props.run?.status !== "NOT_CONFIGURED";
  const active = Boolean(props.run && activeStatuses.has(props.run.status));
  const disabled = props.loading || props.syncing || active || !configured || Boolean(props.error);
  const disabledReason = !configured
    ? "乐享知识库尚未配置"
    : props.error
      ? "同步状态暂不可用"
      : props.loading
        ? "正在读取同步状态"
        : active || props.syncing
          ? "同步任务正在执行"
          : undefined;

  return (
    <section className="lexiang-pull-sync-panel" aria-label="乐享课程知识回拉同步" aria-busy={props.loading || props.syncing}>
      <header>
        <div>
          <strong>乐享课程知识回拉</strong>
          <span>仅同步课程共享知识库，不影响专家 Skill 与专家专属库。</span>
        </div>
        <button
          type="button"
          disabled={disabled}
          title={disabledReason}
          onClick={() => void props.onSync()}
        >
          <RefreshCw className={props.syncing || active ? "spin" : undefined} size={15} aria-hidden="true" />
          {props.syncing || active ? "同步中" : "立即同步"}
        </button>
      </header>

      {props.loading && !props.run ? (
        <p className="lexiang-pull-sync-message" role="status">正在读取最近一次同步状态…</p>
      ) : props.error ? (
        <p className="lexiang-pull-sync-message error" role="alert">同步状态暂不可用：{props.error}</p>
      ) : !configured ? (
        <p className="lexiang-pull-sync-message" role="status">
          {props.configurationMessage || "乐享知识库尚未配置，请先由运维人员完成服务端空间与凭据配置。"}
        </p>
      ) : props.run ? (
        <div className="lexiang-pull-sync-summary" aria-live="polite">
          <dl className="lexiang-pull-sync-meta">
            <div>
              <dt>状态</dt>
              <dd className={getStatusTone(props.run.status)}>{statusLabels[props.run.status] || props.run.status}</dd>
            </div>
            <div>
              <dt>开始时间</dt>
              <dd>{formatRunTime(props.run.startedAt)}</dd>
            </div>
            <div>
              <dt>结束时间</dt>
              <dd>{formatRunTime(props.run.completedAt)}</dd>
            </div>
          </dl>
          <dl className="lexiang-pull-sync-counts">
            {[
              ["新增", props.run.addedCount],
              ["更新", props.run.updatedCount],
              ["缺失", props.run.missingCount],
              ["冲突", props.run.conflictCount],
              ["失败", props.run.failedCount],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {props.run.message && <p className="lexiang-pull-sync-note">{props.run.message}</p>}
        </div>
      ) : (
        <p className="lexiang-pull-sync-message" role="status">暂无同步记录，可点击“立即同步”创建首次回拉任务。</p>
      )}
    </section>
  );
}
