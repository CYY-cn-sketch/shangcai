import { expect, test, type Page } from "@playwright/test";

const password = process.env.SUFE_E2E_PASSWORD || "";

test.describe.configure({ timeout: 60_000 });

function collectUnexpectedFailures(page: Page) {
  const consoleErrors: string[] = [];
  const httpFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    const expectedAnonymousProbe = response.status() === 401 && response.url().includes("/api/auth/me");
    if (response.status() >= 400 && !expectedAnonymousProbe) httpFailures.push(`${response.status()} ${response.url()}`);
  });
  return { consoleErrors, httpFailures };
}

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(!password, "需要通过 SUFE_E2E_PASSWORD 提供专用测试密码");
  test.skip(testInfo.project.name !== "desktop-chromium", "多会话侧栏先在桌面端验收");
});

test("同一创意可以新建独立对话并在刷新后恢复", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  let createdConversationId = "";

  await page.goto("/");
  await page.getByLabel("账号").fill("student@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();
  await expect(page.locator(".buddy-shell")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".buddy-conversation-item.active")).toBeVisible({ timeout: 15_000 });

  try {
    const initialCount = await page.locator(".buddy-conversation-item").count();
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && /\/api\/student\/ideas\/[^/]+\/conversations$/.test(response.url()),
    );
    await page.getByRole("button", { name: "新建对话" }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    createdConversationId = ((await response.json()) as { id: string }).id;

    await expect(page.locator(".buddy-conversation-item")).toHaveCount(initialCount + 1);
    await expect(page.locator(".buddy-conversation-item.active")).toContainText("对话");
    await page.reload();
    await expect(page.locator(".buddy-shell")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".buddy-conversation-item.active")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".buddy-conversation-item")).toHaveCount(initialCount + 1);
    await page.screenshot({ path: testInfo.outputPath("multi-conversation.png") });

    const activeDeleteButton = page.locator(".buddy-conversation-row:has(.buddy-conversation-item.active) .buddy-conversation-delete");
    await expect(activeDeleteButton).toBeAttached();
    await activeDeleteButton.click({ force: true });
    await expect(page.getByRole("dialog", { name: /确认删除/ })).toContainText("不会删除所属创意、其他对话或已保存的阶段成果");
    const deleteResponsePromise = page.waitForResponse(
      (deleteResponse) => deleteResponse.request().method() === "DELETE"
        && deleteResponse.url().includes(`/api/student/conversations/${createdConversationId}`),
    );
    await page.getByRole("button", { name: "确认删除对话" }).click();
    expect((await deleteResponsePromise).ok()).toBe(true);
    await expect(page.locator(".buddy-conversation-item")).toHaveCount(initialCount);
    createdConversationId = "";
  } finally {
    if (createdConversationId) {
      await page.evaluate(async (conversationId) => {
        const csrf = await fetch("/api/auth/csrf", { credentials: "include" }).then((result) => result.json()) as {
          headerName: string;
          token: string;
        };
        const response = await fetch(`/api/student/conversations/${encodeURIComponent(conversationId)}`, {
          method: "DELETE",
          credentials: "include",
          headers: { [csrf.headerName]: csrf.token },
        });
        if (!response.ok) throw new Error(`清理测试对话失败：HTTP ${response.status}`);
      }, createdConversationId);
    }
  }

  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});

test("阶段成果在消息下方确认且不会弹出单独交接卡或强制切换专家", async ({ page }) => {
  const failures = collectUnexpectedFailures(page);
  const ideaId = "idea-handoff-e2e";
  const now = "2026-08-03T12:00:00Z";
  const brainstormConversation = {
    id: "conversation-brainstorm-e2e",
    ideaId,
    title: "创意头脑风暴专家对话",
    status: "ACTIVE",
    selectedExpertId: "brainstorm",
    selectedSkillId: "idea-map",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [{
      id: "message-brainstorm-e2e",
      clientMessageId: "client-brainstorm-e2e",
      ideaId,
      conversationId: "conversation-brainstorm-e2e",
      sender: "AI",
      expertId: "brainstorm",
      expertName: "创意头脑风暴专家",
      skillName: "创意整理",
      artifactType: "BRAINSTORM",
      content: "已形成两个可验证的校园循环方向。",
      blocks: [{ title: "候选方向", items: ["按宿舍楼组织可信交换", "按课程周期组织闲置教材流转"] }],
      createdAt: now,
    }],
    createdAt: now,
    lastMessageAt: null,
    updatedAt: now,
  };
  const payload = {
    kind: "CONFIRMED_STAGE_ARTIFACT",
    schemaVersion: 1,
    sourceExpertId: "brainstorm",
    sourceMessageId: "message-brainstorm-e2e",
    ideaId,
    artifactType: "BRAINSTORM",
    title: "校园循环服务 - 头脑风暴",
    summary: "已形成两个可验证的校园循环方向。",
    content: { blocks: [{ title: "候选方向", items: ["按宿舍楼组织可信交换", "按课程周期组织闲置教材流转"] }] },
  };
  const artifact = {
    id: "artifact-handoff-e2e",
    ideaId,
    sourceMessageId: payload.sourceMessageId,
    artifactType: "BRAINSTORM",
    title: "校园循环服务 - 头脑风暴",
    summary: payload.sourceSummary,
    content: payload.content,
    fileAvailable: false,
    createdAt: now,
    updatedAt: now,
  };
  const confirmed = {
    id: "handoff-e2e",
    ideaId,
    sourceArtifactId: artifact.id,
    sourceExpertId: "brainstorm",
    targetExpertId: "ALL",
    status: "CONFIRMED",
    payload,
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  let confirmedRecords: typeof confirmed[] = [];
  let confirmCount = 0;

  await page.route("**/api/student/workspace", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ideas: [{ id: ideaId, title: "校园循环服务", description: "让学生更方便地流转闲置物品", stage: "头脑风暴", createdAt: now, updatedAt: now }],
      conversations: [brainstormConversation],
    }),
  }));
  await page.route("**/api/student/artifacts", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([artifact]) });
  });
  await page.route("**/api/student/handoffs**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(confirmedRecords),
  }));
  await page.route("**/api/student/artifacts/artifact-handoff-e2e/handoffs", async (route) => {
    confirmCount += 1;
    confirmedRecords = [confirmed];
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(confirmed) });
  });

  await page.goto("/");
  await page.getByLabel("账号").fill("student@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();
  await expect(page.getByRole("button", { name: "确认本版为正式阶段成果" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".expert-handoff-card")).toHaveCount(0);
  await page.getByRole("button", { name: "确认本版为正式阶段成果" }).click();

  await expect(page.getByRole("button", { name: "已确认为当前正式成果" })).toBeDisabled();
  await expect(page.locator(".buddy-chat-head")).toContainText("创意头脑风暴专家对话");
  await expect(page.locator(".buddy-current-expert")).toContainText("创意头脑风暴专家");
  expect(confirmCount).toBe(1);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
