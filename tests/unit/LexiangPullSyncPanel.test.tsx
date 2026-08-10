import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LexiangPullSyncPanel } from "../../src/LexiangPullSyncPanel";
import type { LexiangPullRunRecord } from "../../src/api/knowledge";

const completedRun: LexiangPullRunRecord = {
  id: "pull-001",
  configured: true,
  status: "COMPLETED",
  startedAt: "2026-08-07T01:30:00Z",
  completedAt: "2026-08-07T01:31:30Z",
  addedCount: 4,
  updatedCount: 3,
  missingCount: 2,
  conflictCount: 1,
  failedCount: 0,
  message: "课程共享知识库已完成回拉。",
};

describe("LexiangPullSyncPanel", () => {
  it("展示最近同步状态、时间和五类计数，并允许显式触发同步", async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();
    render(
      <LexiangPullSyncPanel
        scopeType="COURSE_SHARED"
        run={completedRun}
        configured
        loading={false}
        syncing={false}
        error={null}
        onSync={onSync}
      />,
    );

    const panel = screen.getByRole("region", { name: "乐享课程知识回拉同步" });
    expect(within(panel).getByText("同步完成")).toBeInTheDocument();
    expect(within(panel).getByText("开始时间")).toBeInTheDocument();
    expect(within(panel).getByText("结束时间")).toBeInTheDocument();
    expect(within(panel).getByText("新增").nextElementSibling).toHaveTextContent("4");
    expect(within(panel).getByText("更新").nextElementSibling).toHaveTextContent("3");
    expect(within(panel).getByText("缺失").nextElementSibling).toHaveTextContent("2");
    expect(within(panel).getByText("冲突").nextElementSibling).toHaveTextContent("1");
    expect(within(panel).getByText("失败").nextElementSibling).toHaveTextContent("0");

    await user.click(within(panel).getByRole("button", { name: "立即同步" }));
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it("乐享未配置时给出明确原因并禁用同步按钮", () => {
    render(
      <LexiangPullSyncPanel
        scopeType="COURSE_SHARED"
        run={{ ...completedRun, configured: false, status: "NOT_CONFIGURED" }}
        configured={false}
        loading={false}
        syncing={false}
        error={null}
        onSync={vi.fn()}
      />,
    );

    expect(screen.getByText(/乐享知识库尚未配置/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即同步" })).toBeDisabled();
  });

  it("专家专属知识库不展示乐享回拉入口", () => {
    render(
      <LexiangPullSyncPanel
        scopeType="EXPERT_PRIVATE"
        run={completedRun}
        configured
        loading={false}
        syncing={false}
        error={null}
        onSync={vi.fn()}
      />,
    );

    expect(screen.queryByRole("region", { name: "乐享课程知识回拉同步" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "立即同步" })).not.toBeInTheDocument();
  });
});
