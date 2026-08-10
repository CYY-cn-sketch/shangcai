import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpertDeleteConfirmModal } from "../../src/App";
import { deleteKnowledgeExpert } from "../../src/api/knowledge";

const expert: ComponentProps<typeof ExpertDeleteConfirmModal>["expert"] = {
  id: "pitch",
  name: "路演 PPT 专家",
  role: "生成路演 PPT",
  scenario: "路演材料",
  icon: () => <span />,
  accent: "#005aa8",
  skills: [],
  active: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("专家删除", () => {
  it("明确说明级联删除边界并要求二次确认", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ExpertDeleteConfirmModal
        expert={expert}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("确认后将删除专家并连同专属检索库、Skill 来源档案；课程共享知识库不受影响。")).toBeInTheDocument();
    expect(screen.getByText(/同时删除：专家配置、专属检索资料与 Skill 来源档案/)).toBeInTheDocument();
    expect(screen.getByText(/继续保留：全部课程共享知识库及其中资料/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认删除专家及专属数据" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("删除请求显式携带 deletePrivateKnowledge=true", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "test-csrf" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteKnowledgeExpert("pitch", true);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/knowledge/experts/pitch?deletePrivateKnowledge=true",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });
});
