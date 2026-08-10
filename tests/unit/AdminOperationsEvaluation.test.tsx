import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminOperationsEvaluation } from "../../src/AdminOperationsEvaluation";
import type {
  AdminOperationsEvaluationCard,
  AdminOperationsReport,
} from "../../src/api/admin";

function card(
  key: string,
  title: string,
  value: string,
  overrides: Partial<AdminOperationsEvaluationCard> = {},
): AdminOperationsEvaluationCard {
  return {
    key,
    title,
    value,
    badge: "系统汇总",
    definition: `${title}的后端统计口径。`,
    numerator: 0,
    denominator: null,
    periodStart: null,
    periodEnd: "2026-08-05T10:00:00Z",
    sources: ["系统汇总"],
    zeroReason: null,
    statements: [`${title}由后端规则生成。`],
    records: [],
    ...overrides,
  };
}

const report: AdminOperationsReport = {
  generatedAt: "2026-08-05T10:00:00Z",
  accounts: { students: 2, teachers: 1, admins: 1 },
  groupCount: 2,
  artifactCount: 1,
  submissions: { total: 1, pending: 1, approved: 0, revision: 0, excellent: 0, processedRate: 0, passRate: 0 },
  knowledge: { bases: 2, activeBases: 1, assets: 3, activeAssets: 2 },
  providers: {
    deepSeekCalls: 0,
    lexiangPptCalls: 0,
    workBuddyVideoJobs: 0,
    workBuddyVideoCompleted: 0,
    queuedJobs: 0,
    runningJobs: 0,
    failedJobs: 0,
  },
  totalTokensLast30Days: 0,
  groups: [],
  recentActivity: [],
  evaluation: {
    sourceCategories: ["系统汇总", "AI 诊断记录", "教师反馈", "供应商运行记录"],
    kpis: [
      card("group-participation-rate", "小组阶段参与率", "50%", {
        numerator: 1,
        denominator: 2,
        records: [{
          id: "group-1",
          kind: "小组",
          title: "智慧财务助手",
          detail: "2 名成员 · 1 项成果",
          groupLabel: "第 1 组",
          status: "已有成果",
          occurredAt: "2026-08-05T09:00:00Z",
        }],
      }),
      card("artifact-pass-rate", "成果通过率", "0%", { denominator: 1, zeroReason: "当前没有通过成果。" }),
      card("revision-count", "退回修改数", "0 项", { sources: ["教师反馈"], zeroReason: "暂无退回记录。" }),
      card("excellent-count", "优秀案例数", "0 项", { sources: ["教师反馈"], zeroReason: "暂无优秀标记。" }),
    ],
    summaries: [
      card("system-summary", "系统数据汇总", "1 项成果"),
      card("current-verifiable-outcomes", "当前可验证成效", "0 条反馈 · 0 项诊断", {
        sources: ["系统汇总", "AI 诊断记录", "教师反馈", "供应商运行记录"],
      }),
      card("next-step-summary", "下一步建议", "暂无证据问题"),
    ],
    reviews: [
      card("stage-progress", "阶段进展", "1/2 组参与"),
      card("key-findings", "关键发现", "0 类有证据问题", {
        sources: ["AI 诊断记录", "教师反馈"],
        zeroReason: "暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。",
      }),
      card("risk-tracking", "风险跟踪", "2 项待跟进"),
      card("next-actions", "下阶段动作", "1 项优先审核"),
    ],
    evidence: [
      card("submission-evidence", "阶段成果", "1 项"),
      card("teacher-feedback-evidence", "教师反馈", "0 条", {
        sources: ["教师反馈"],
        zeroReason: "暂无已保存教师反馈；请先由教师完成成果审核并保存反馈。",
      }),
      card("ai-diagnosis-evidence", "AI 诊断记录", "0 项", {
        sources: ["AI 诊断记录"],
        zeroReason: "暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。",
      }),
      card("provider-evidence", "供应商运行记录", "0 次", {
        sources: ["供应商运行记录"],
        zeroReason: "最近 30 天暂无供应商运行记录。",
      }),
    ],
  },
};

describe("AdminOperationsEvaluation", () => {
  it("所有核心卡片可打开统一详情并显示口径、分子分母、来源和关联明细", async () => {
    const user = userEvent.setup();
    render(<AdminOperationsEvaluation report={report} error="" onRefresh={vi.fn()} />);

    expect(screen.getByLabelText("运营评估数据来源")).toHaveTextContent("系统汇总");
    expect(screen.getByLabelText("运营评估数据来源")).toHaveTextContent("AI 诊断记录");
    await user.click(screen.getByRole("button", { name: "查看小组阶段参与率详情" }));

    const dialog = screen.getByRole("dialog", { name: "小组阶段参与率" });
    expect(within(dialog).getByText("小组阶段参与率的后端统计口径。")).toBeInTheDocument();
    expect(within(dialog).getByText("分子 1 / 分母 2")).toBeInTheDocument();
    expect(within(dialog).getByText("智慧财务助手")).toBeInTheDocument();
    expect(within(dialog).getByText("系统汇总")).toBeInTheDocument();
  });

  it("零值详情明确解释原因，刷新只调用传入的后端刷新动作", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<AdminOperationsEvaluation report={report} error="" onRefresh={onRefresh} />);

    await user.click(screen.getByRole("button", { name: "查看关键发现详情" }));
    const dialog = screen.getByRole("dialog", { name: "关键发现" });
    expect(within(dialog).getByText("为什么当前为 0")).toBeInTheDocument();
    expect(within(dialog).getAllByText("暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。").length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole("button", { name: "关闭运营指标详情" }));

    await user.click(screen.getByRole("button", { name: "手动刷新" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("报告刷新后让已打开详情使用同 key 的最新数据", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AdminOperationsEvaluation report={report} error="" onRefresh={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "查看小组阶段参与率详情" }));
    expect(screen.getByRole("dialog", { name: "小组阶段参与率" })).toHaveTextContent("50%");

    const refreshedReport: AdminOperationsReport = {
      ...report,
      generatedAt: "2026-08-06T10:00:00Z",
      evaluation: {
        ...report.evaluation,
        kpis: report.evaluation.kpis.map((current) => current.key === "group-participation-rate"
          ? {
              ...current,
              value: "100%",
              numerator: 2,
              records: [{
                id: "group-2",
                kind: "小组",
                title: "刷新后项目",
                detail: "最新后端明细",
                groupLabel: "第 2 组",
              }],
            }
          : current),
      },
    };

    rerender(<AdminOperationsEvaluation report={refreshedReport} error="" onRefresh={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "小组阶段参与率" });
    expect(dialog).toHaveTextContent("100%");
    expect(within(dialog).getByText("分子 2 / 分母 2")).toBeInTheDocument();
    expect(within(dialog).getByText("刷新后项目")).toBeInTheDocument();
    expect(within(dialog).queryByText("智慧财务助手")).not.toBeInTheDocument();
  });
});
