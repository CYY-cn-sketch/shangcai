import { expect, test, type Page, type Route } from "@playwright/test";

const now = "2026-08-05T10:00:00Z";
const studentSession = {
  id: "student-feedback-e2e",
  role: "student",
  name: "反馈归属测试学生",
  account: "student-feedback-e2e@sufe.test",
  title: "学生",
  avatarId: "student-1",
  groupId: "group-feedback-e2e",
  groupLabel: "反馈测试组",
  groupName: "反馈归属测试组",
  quota: 100,
  lexiangPptQuota: 10,
  workbuddyVideoQuota: 10,
  disabledPermissions: [],
};
const knowledgeExperts = [
  {
    id: "pitch",
    name: "路演 PPT 专家",
    role: "将 BP 转换为可讲述的路演结构",
    scenario: "10 页大纲、页面观点、讲稿建议",
    accent: "#005aa8",
    active: true,
    skills: [{ id: "deck", name: "10 页 PPT 大纲", stage: "路演 PPT", description: "生成路演结构" }],
    knowledgeCategories: [],
  },
  {
    id: "business",
    name: "商业模式/BP 专家",
    role: "把项目整理成商业计划书框架",
    scenario: "商业模式画布、BP 大纲、财务假设",
    accent: "#22406a",
    active: true,
    skills: [{ id: "bp", name: "BP 大纲", stage: "商业计划书", description: "生成 BP 章节结构" }],
    knowledgeCategories: [],
  },
  {
    id: "script",
    name: "路演稿生成专家",
    role: "把阶段成果转换为可讲述的路演稿",
    scenario: "1 分钟、3 分钟、5 分钟路演稿",
    accent: "#76520e",
    active: true,
    skills: [{ id: "script", name: "路演稿", stage: "路演稿", description: "生成多时长路演稿" }],
    knowledgeCategories: [],
  },
];

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

function conversation(id: string, ideaId: string, title: string, expertId: "pitch" | "business") {
  return {
    id,
    ideaId,
    title,
    status: "ACTIVE",
    selectedExpertId: expertId,
    selectedSkillId: expertId === "pitch" ? "deck" : "bp",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [{
      id: `message-${id}`,
      clientMessageId: `client-${id}`,
      ideaId,
      conversationId: id,
      sender: "AI",
      expertId,
      expertName: expertId === "pitch" ? "路演 PPT 专家" : "商业模式/BP 专家",
      skillName: expertId === "pitch" ? "10 页 PPT 大纲" : "BP 大纲",
      artifactType: expertId === "pitch" ? "PPT" : "BP",
      content: `${title} 已形成阶段成果。`,
      blocks: [{ title: "核心结论", items: [`${title} 已形成阶段成果。`] }],
      createdAt: now,
    }],
    createdAt: now,
    lastMessageAt: now,
    updatedAt: now,
  };
}

function submission(
  id: string,
  submissionVersion: number,
  ideaId: string,
  artifactType: "BRAINSTORM" | "MARKET" | "PPT",
  title: string,
  teacherComment: string,
  submittedAt: string,
  sourceMessageId = `message-${id}`,
) {
  return {
    id,
    artifactId: `artifact-${id}`,
    submissionVersion,
    ideaId,
    sourceMessageId,
    student: "反馈归属测试学生",
    group: "反馈测试组",
    groupName: "反馈归属测试组",
    artifactType,
    artifactTitle: title,
    artifactSummary: `${title} 的成果摘要`,
    content: [{ title: "核心结论", items: [title] }],
    status: "APPROVED",
    teacherComment,
    excellent: false,
    submittedAt,
    reviewedAt: submittedAt,
    updatedAt: submittedAt,
  };
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "学生反馈归属在桌面端验收");

  const workspace = {
    ideas: [
      { id: "idea-a", title: "创意 A：校园循环服务", description: "A 创意", stage: "路演 PPT", createdAt: now, updatedAt: now },
      { id: "idea-b", title: "创意 B：课程预约助手", description: "B 创意", stage: "市场分析", createdAt: now, updatedAt: now },
    ],
    conversations: [
      conversation("conversation-a-1", "idea-a", "A 创意第 1 轮路演对话", "pitch"),
      conversation("conversation-a-2", "idea-a", "A 创意第 2 轮商业模式对话", "business"),
      conversation("conversation-b-1", "idea-b", "B 创意市场对话", "pitch"),
    ],
  };
  const submissions = [
    submission("a-ppt-latest", 2, "idea-a", "PPT", "A 创意路演稿第二版", "A 创意 PPT 第二版最新审核意见", "2026-08-05T09:40:00Z", "message-conversation-a-1"),
    submission("b-market", 1, "idea-b", "MARKET", "B 创意市场分析", "B 创意独立审核意见", "2026-08-05T09:30:00Z"),
    submission("a-ppt-history", 1, "idea-a", "PPT", "A 创意路演稿第一版", "A 创意 PPT 第一版历史审核意见", "2026-08-05T09:20:00Z"),
    submission("a-brainstorm", 1, "idea-a", "BRAINSTORM", "A 创意头脑风暴", "A 创意头脑风暴历史审核意见", "2026-08-05T09:10:00Z"),
  ];

  await page.addInitScript(() => {
    const retention = JSON.stringify({ expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    window.sessionStorage.setItem("sufe.auth.tab-retention", retention);
    window.localStorage.setItem("sufe.auth.device-retention", retention);
  });
  await page.route("**/api/auth/session", (route) => json(route, studentSession));
  await page.route("**/api/auth/csrf", (route) => json(route, { headerName: "X-CSRF-TOKEN", token: "test-token" }));
  await page.route("**/api/student/workspace", (route) => json(route, workspace));
  await page.route("**/api/student/artifacts", (route) => json(route, []));
  await page.route("**/api/student/submissions", (route) => json(route, submissions));
  await page.route("**/api/student/defense-practices", (route) => json(route, []));
  await page.route("**/api/student/handoffs**", (route) => json(route, []));
  await page.route("**/api/knowledge/knowledge-bases", (route) => json(route, []));
  await page.route("**/api/knowledge/knowledge-assets", (route) => json(route, []));
  await page.route("**/api/knowledge/experts", (route) => json(route, knowledgeExperts));
});

async function openFeedback(page: Page) {
  await page.getByRole("button", { name: "老师反馈", exact: true }).click();
  await expect(page.getByRole("heading", { name: "老师反馈" })).toBeVisible();
}

test("老师反馈按 ideaId 聚合全部提交、跨对话共享并与其他创意隔离", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".buddy-shell")).toBeVisible({ timeout: 15_000 });

  await page.locator(".buddy-conversation-item", { hasText: "A 创意第 2 轮商业模式对话" }).click();
  await openFeedback(page);
  await expect(page.locator(".feedback-page .panel-title")).toContainText("当前创意：创意 A：校园循环服务");
  await expect(page.locator(".submission-card")).toHaveCount(3);
  await expect(page.getByText("A 创意 PPT 第二版最新审核意见", { exact: true })).toBeVisible();
  await expect(page.getByText("A 创意 PPT 第一版历史审核意见", { exact: true })).toBeVisible();
  await expect(page.getByText("A 创意头脑风暴历史审核意见", { exact: true })).toBeVisible();
  await expect(page.locator(".submission-card").filter({ hasText: "A 创意路演稿第二版" })).toContainText("第 2 版");
  await expect(page.locator(".submission-card").filter({ hasText: "A 创意路演稿第一版" })).toContainText("第 1 版");
  await expect(page.getByText("B 创意独立审核意见", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("student-feedback-idea-a.png"), fullPage: true });

  await page.getByRole("button", { name: "回到 AI 创意工作台" }).click();
  await page.locator(".buddy-conversation-item", { hasText: "A 创意第 1 轮路演对话" }).click();
  await openFeedback(page);
  await expect(page.locator(".submission-card")).toHaveCount(3);
  await expect(page.getByText("A 创意 PPT 第二版最新审核意见", { exact: true })).toBeVisible();
  await expect(page.getByText("A 创意 PPT 第一版历史审核意见", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "回到 AI 创意工作台" }).click();
  await page.locator(".buddy-conversation-item", { hasText: "B 创意市场对话" }).click();
  await openFeedback(page);
  await expect(page.locator(".feedback-page .panel-title")).toContainText("当前创意：创意 B：课程预约助手");
  await expect(page.locator(".submission-card")).toHaveCount(1);
  await expect(page.getByText("B 创意独立审核意见", { exact: true })).toBeVisible();
  await expect(page.getByText("A 创意 PPT 第二版最新审核意见", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("student-feedback-idea-b.png"), fullPage: true });
});

test("根据反馈继续修改时恢复成果来源对话", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".buddy-shell")).toBeVisible({ timeout: 15_000 });

  await page.locator(".buddy-conversation-item", { hasText: "A 创意第 2 轮商业模式对话" }).click();
  await openFeedback(page);
  const sourceSubmission = page.locator(".submission-card", { hasText: "A 创意路演稿第二版" });
  await sourceSubmission.getByRole("button", { name: "根据反馈继续修改" }).click();

  await expect(page.locator(".buddy-conversation-item.active")).toContainText("A 创意第 1 轮路演对话");
  await expect(page.getByLabel("和 AI 助教对话")).toHaveValue(/A 创意 PPT 第二版最新审核意见/);
});

test("快捷生成路演稿切换到独立专家对话且不改写来源对话", async ({ page }) => {
  let createdScriptConversations = 0;
  let sourceConversationPatches = 0;
  await page.route("**/api/student/ideas/idea-a/conversations", async (route) => {
    createdScriptConversations += 1;
    const input = route.request().postDataJSON();
    return json(route, {
      id: "conversation-a-script",
      ideaId: "idea-a",
      ...input,
      status: "ACTIVE",
      messages: [],
      createdAt: now,
      lastMessageAt: null,
      updatedAt: now,
    });
  });
  await page.route(/\/api\/student\/conversations\/conversation-a-2$/, async (route) => {
    sourceConversationPatches += 1;
    return json(route, {});
  });

  await page.goto("/");
  await expect(page.locator(".buddy-shell")).toBeVisible({ timeout: 15_000 });
  await page.locator(".buddy-conversation-item", { hasText: "A 创意第 2 轮商业模式对话" }).click();
  await page.getByRole("button", { name: "生成路演稿" }).click();

  await expect(page.locator(".buddy-conversation-item.active")).toContainText("路演稿生成专家对话");
  await expect(page.locator(".buddy-current-expert")).toContainText("路演稿生成专家");
  await expect(page.getByLabel("和 AI 助教对话")).toHaveValue(/1 分钟、3 分钟、5 分钟路演稿/);
  await page.waitForTimeout(400);
  expect(createdScriptConversations).toBe(1);
  expect(sourceConversationPatches).toBe(0);
});
