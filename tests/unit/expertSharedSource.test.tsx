import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";

const sharedExpert = {
  id: "shared-source-expert",
  name: "共享真源验收专家",
  role: "验证教师端与管理端读取同一专家配置",
  scenario: "专家列表真源接线验收",
  accent: "#174a7e",
  active: true,
  skills: [{ id: "shared-source-skill", name: "共享真源检查", stage: "配置验收", description: "检查两端专家列表" }],
  knowledgeCategories: [],
};

const emptyOperationsReport = {
  generatedAt: "2026-08-06T00:00:00Z",
  accounts: { students: 0, teachers: 0, admins: 1 },
  groupCount: 0,
  artifactCount: 0,
  submissions: { total: 0, pending: 0, approved: 0, revision: 0, excellent: 0, processedRate: 0, passRate: 0 },
  knowledge: { bases: 0, activeBases: 0, assets: 0, activeAssets: 0 },
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
};

function session(role: "teacher" | "admin") {
  return {
    id: `${role}-shared-source`,
    role,
    name: role === "teacher" ? "真源验收教师" : "真源验收管理员",
    account: `${role}-shared-source@sufe.test`,
    title: role === "teacher" ? "课程教师" : "平台管理员",
    avatarId: role,
    quota: 100,
    lexiangPptQuota: 10,
    workbuddyVideoQuota: 10,
    disabledPermissions: [],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("教师端和管理端专家真源", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("真实 App 父级让教师端和管理端消费同一后端专家列表", async () => {
    let activeRole: "teacher" | "admin" = "teacher";
    const expertRequests: string[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/auth/session") return json(session(activeRole));
      if (url === "/api/knowledge/experts") {
        expertRequests.push(activeRole);
        return json([sharedExpert]);
      }
      if (url === "/api/knowledge/knowledge-bases" || url === "/api/knowledge/knowledge-assets") return json([]);
      if (url === "/api/teacher/submissions") return json([]);
      if (url === "/api/admin/groups" || url === "/api/admin/accounts") return json([]);
      if (url === "/api/admin/operations") return json(emptyOperationsReport);
      throw new Error(`未处理的测试请求：${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.sessionStorage.setItem("sufe.auth.tab-retention", JSON.stringify({ expiresAt: Date.now() + 60_000 }));

    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "专家配置与 Skill 管理" }));
    expect(await screen.findByText(sharedExpert.name)).toBeInTheDocument();

    cleanup();
    activeRole = "admin";
    window.sessionStorage.setItem("sufe.auth.tab-retention", JSON.stringify({ expiresAt: Date.now() + 60_000 }));
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "专家配置与 Skill 管理" }));
    expect(await screen.findByText(sharedExpert.name)).toBeInTheDocument();

    expect(expertRequests).toEqual(["teacher", "admin"]);
  });
});
