import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/visuals", () => ({
  LoginThreeScene: () => <div aria-hidden="true" />,
  SufeSeal: () => <div aria-hidden="true" />,
  StudentCartoonAvatar: ({ avatarId }: { avatarId: string }) => <span>{avatarId}</span>,
}));

import { LoginView } from "../../src/authViews";

const accounts = [
  {
    id: "A-STU-001",
    role: "student" as const,
    name: "测试学生",
    account: "student@sufe.demo",
    title: "创业实践课学生",
    avatarId: "student-boy",
    quota: 100,
    disabledPermissions: [],
    groupOrScope: "第 1 组",
    status: "已开通" as const,
  },
  {
    id: "A-TEA-001",
    role: "teacher" as const,
    name: "测试教师",
    account: "teacher@sufe.demo",
    title: "创业实践课程教师",
    avatarId: "teacher",
    quota: 100,
    disabledPermissions: [],
    groupOrScope: "全部项目组",
    status: "已开通" as const,
  },
];

describe("LoginView", () => {
  it("shows a corrective message before submitting an incomplete login", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(<LoginView accountRecords={accounts} onLogin={onLogin} />);

    await user.click(screen.getByRole("button", { name: "登录进入系统" }));

    expect(screen.getByText("请输入账号和密码。")).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("switches roles and submits the selected account", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginView accountRecords={accounts} onLogin={onLogin} />);

    await user.click(screen.getByRole("button", { name: "教师端" }));
    expect(screen.getByLabelText("账号")).toHaveValue("teacher@sufe.demo");
    await user.type(screen.getByLabelText("密码"), "e2e-password");
    await user.click(screen.getByRole("button", { name: "登录进入系统" }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("teacher@sufe.demo", "e2e-password"));
  });
});
