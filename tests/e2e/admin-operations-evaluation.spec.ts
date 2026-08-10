import { expect, test, type Page } from "@playwright/test";
import type { AdminOperationsEvaluationCard, AdminOperationsReport } from "../../src/api/admin";

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
    definition: `${title}由后端真实记录按固定口径统计。`,
    numerator: 0,
    denominator: null,
    periodStart: null,
    periodEnd: "2026-08-05T10:00:00Z",
    sources: ["系统汇总"],
    zeroReason: null,
    statements: [`${title}没有使用前端快照。`],
    records: [],
    ...overrides,
  };
}

const evaluationCards = {
  kpis: [
    card("group-participation-rate", "小组阶段参与率", "0%", { denominator: 2, zeroReason: "暂无小组提交未撤回的阶段成果，因此参与率为 0。" }),
    card("artifact-pass-rate", "成果通过率", "0%", { denominator: 0, zeroReason: "暂无未撤回成果，无法形成通过率。" }),
    card("revision-count", "退回修改数", "0 项", { sources: ["系统汇总", "教师反馈"], zeroReason: "暂无被教师退回修改的成果记录。" }),
    card("excellent-count", "优秀案例数", "0 项", { sources: ["系统汇总", "教师反馈"], zeroReason: "暂无由教师标记并保存的优秀成果。" }),
  ],
  summaries: [
    card("system-summary", "系统数据汇总", "0 项成果"),
    card("current-verifiable-outcomes", "当前可验证成效", "0 条反馈 · 0 项诊断", {
      sources: ["系统汇总", "AI 诊断记录", "教师反馈", "供应商运行记录"],
      zeroReason: "暂无已保存教师反馈。 暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。",
    }),
    card("next-step-summary", "下一步建议", "暂无证据问题", {
      sources: ["系统汇总", "AI 诊断记录", "教师反馈", "供应商运行记录"],
      zeroReason: "当前没有可回溯到具体成果的高频问题。",
    }),
  ],
  reviews: [
    card("stage-progress", "阶段进展", "0/2 组参与", { zeroReason: "暂无小组提交阶段成果，无法形成阶段进展。" }),
    card("key-findings", "关键发现", "0 类有证据问题", {
      sources: ["AI 诊断记录", "教师反馈"],
      zeroReason: "暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。",
    }),
    card("risk-tracking", "风险跟踪", "2 项待跟进"),
    card("next-actions", "下阶段动作", "0 项优先审核", { zeroReason: "当前暂无可排定的后续动作。" }),
  ],
  evidence: [
    card("submission-evidence", "阶段成果", "0 项", { zeroReason: "暂无未撤回的成果提交记录。" }),
    card("teacher-feedback-evidence", "教师反馈", "0 条", { sources: ["教师反馈"], zeroReason: "暂无已保存教师反馈。" }),
    card("ai-diagnosis-evidence", "AI 诊断记录", "0 项", { sources: ["AI 诊断记录"], zeroReason: "暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。" }),
    card("provider-evidence", "供应商运行记录", "0 次", { sources: ["供应商运行记录"], zeroReason: "最近 30 天暂无供应商运行记录。" }),
  ],
};

const operationsReport: AdminOperationsReport = {
  generatedAt: "2026-08-05T10:00:00Z",
  accounts: { students: 2, teachers: 1, admins: 1 },
  groupCount: 2,
  artifactCount: 0,
  submissions: { total: 0, pending: 0, approved: 0, revision: 0, excellent: 0, processedRate: 0, passRate: 0 },
  knowledge: { bases: 2, activeBases: 2, assets: 0, activeAssets: 0 },
  providers: { deepSeekCalls: 0, lexiangPptCalls: 0, workBuddyVideoJobs: 0, workBuddyVideoCompleted: 0, queuedJobs: 0, runningJobs: 0, failedJobs: 0 },
  totalTokensLast30Days: 0,
  groups: [],
  recentActivity: [],
  evaluation: {
    sourceCategories: ["系统汇总", "AI 诊断记录", "教师反馈", "供应商运行记录"],
    ...evaluationCards,
  },
};

function collectUnexpectedFailures(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const httpFailures: string[] = [];
  const supplierRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const isSupplierRequest = request.method() !== "GET" && (
      request.url().includes("/api/provider/")
      || request.url().includes("/diagnose")
      || request.url().includes("/generation-jobs")
    );
    if (isSupplierRequest) supplierRequests.push(`${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    const expectedAnonymousProbe = response.status() === 401 && response.url().includes("/api/auth/me");
    if (response.status() >= 400 && !expectedAnonymousProbe) httpFailures.push(`${response.status()} ${response.url()}`);
  });
  return { consoleErrors, pageErrors, httpFailures, supplierRequests };
}

test("试点运营评估以单一后端报告展示零值原因并支持全部详情卡", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "admin-e2e",
        role: "admin",
        name: "运营验收管理员",
        account: "admin-e2e@sufe.local",
        title: "平台管理员",
        avatarId: "admin",
        quota: 0,
        lexiangPptQuota: 0,
        workbuddyVideoQuota: 0,
        disabledPermissions: [],
      }),
    });
  });
  await page.route("**/api/admin/groups", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "group-1", groupLabel: "第 1 组", projectName: "智慧财务助手", active: true, memberCount: 1 },
        { id: "group-2", groupLabel: "第 2 组", projectName: "低碳校园", active: true, memberCount: 0 },
      ]),
    });
  });
  await page.route("**/api/admin/accounts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "admin-e2e",
        account: "admin-e2e@sufe.local",
        role: "ADMIN",
        displayName: "运营验收管理员",
        title: "平台管理员",
        status: "ACTIVE",
        quotaRemaining: 0,
        aiCallsUsed: 0,
        aiCallsRemaining: 0,
        lexiangPptQuota: 0,
        lexiangPptUsed: 0,
        lexiangPptRemaining: 0,
        workbuddyVideoQuota: 0,
        workbuddyVideoUsed: 0,
        workbuddyVideoRemaining: 0,
        disabledPermissions: [],
      }]),
    });
  });
  for (const url of [
    "**/api/knowledge/knowledge-bases",
    "**/api/knowledge/knowledge-assets",
    "**/api/knowledge/lexiang/mappings",
  ]) {
    await page.route(url, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
  }
  await page.route("**/api/knowledge/lexiang/pull-runs/latest", async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/knowledge/experts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "brainstorm",
        name: "头脑风暴专家",
        role: "创业创意引导",
        scenario: "创意探索",
        accent: "从真实问题出发",
        active: true,
        skills: [{ id: "ideation", name: "创意发散", stage: "头脑风暴", description: "生成可验证创意" }],
        knowledgeCategories: [],
      }]),
    });
  });
  await page.route("**/api/admin/operations", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(operationsReport) });
  });
  await page.addInitScript(() => {
    const retention = JSON.stringify({ expiresAt: Date.now() + 8 * 60 * 60 * 1_000 });
    window.sessionStorage.setItem("sufe.auth.tab-retention", retention);
    window.localStorage.setItem("sufe.auth.device-retention", retention);
  });
  await page.setViewportSize(testInfo.project.name === "desktop-chromium"
    ? { width: 1440, height: 1000 }
    : { width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".admin-console-layout")).toBeVisible();

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button"))
      .find((item) => item.textContent?.includes("试点运营评估"));
    if (!(button instanceof HTMLButtonElement)) throw new Error("未找到试点运营评估导航");
    button.click();
  });
  await page.waitForTimeout(300);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
  await expect(page.getByLabel("运营评估数据来源")).toContainText("系统汇总");
  await expect(page.getByLabel("运营评估数据来源")).toContainText("AI 诊断记录");
  await expect(page.getByText("暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。", { exact: true }).first()).toBeVisible();

  const requiredCards = [
    "小组阶段参与率",
    "成果通过率",
    "退回修改数",
    "优秀案例数",
    "系统数据汇总",
    "当前可验证成效",
    "下一步建议",
    "阶段进展",
    "关键发现",
    "风险跟踪",
    "下阶段动作",
    "阶段成果",
    "教师反馈",
    "AI 诊断记录",
    "供应商运行记录",
  ];
  for (const title of requiredCards) {
    await page.getByRole("button", { name: `查看${title}详情` }).click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("指标定义", { exact: true })).toBeVisible();
    await expect(dialog.getByText("分子 / 分母", { exact: true })).toBeVisible();
    await expect(dialog.getByText("数据来源", { exact: true })).toBeVisible();
    await expect(dialog.getByText("关联成果 / 小组 / 记录明细", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "关闭运营指标详情" }).click();
  }

  await page.screenshot({ path: testInfo.outputPath(`admin-operations-evaluation-${testInfo.project.name}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(failures.supplierRequests).toEqual([]);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
