import { expect, test, type Page, type Route } from "@playwright/test";

const password = process.env.SUFE_E2E_PASSWORD || "";

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function login(page: Page) {
  const failedResponses: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  await page.goto("/");
  await page.getByLabel("账号").fill("student@sufe.demo");
  await page.getByLabel("密码").fill(password);
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "登录进入系统" }).click();
  const loginResponse = await Promise.race([
    loginResponsePromise,
    page.getByText(/请求失败：HTTP \d+/).waitFor({ state: "visible" }).then(() => null),
  ]);
  if (!loginResponse) {
    throw new Error(`登录请求发送前失败；HTTP 失败：${failedResponses.join(", ")}`);
  }
  expect(loginResponse.status(), `登录接口异常；HTTP 失败：${failedResponses.join(", ")}`).toBe(200);
  await expect(page.locator(".app-shell"), `登录后页面未进入系统；HTTP 失败：${failedResponses.join(", ")}`).toBeVisible({
    timeout: 15_000,
  });
}

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(!password, "需要通过 SUFE_E2E_PASSWORD 提供专用测试密码");
  test.skip(testInfo.project.name !== "desktop-chromium", "PPT 语义意图在桌面端验收");
});

test("自然语言要求制作路演展示时直接返回 PPT 阶段成果", async ({ page }) => {
  const idea = {
    id: "idea-ppt-intent",
    title: "AI 创业实践教学助手",
    description: "把学生生成、教师审核和成果沉淀连成教学闭环",
    stage: "路演准备",
    createdAt: "2026-07-31T10:00:00",
    updatedAt: "2026-07-31T10:00:00",
  };
  const conversation = {
    id: "conversation-ppt-intent",
    ideaId: idea.id,
    selectedExpertId: "pitch",
    selectedSkillId: "deck",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [],
    updatedAt: "2026-07-31T10:00:00",
  };
  let providerInput: Record<string, unknown> | null = null;

  await page.route("**/api/student/workspace", (route) => json(route, { ideas: [idea], conversations: [conversation] }));
  await page.route("**/api/student/conversations/conversation-ppt-intent", async (route) => {
    const input = route.request().postDataJSON();
    return json(route, { ...conversation, ...input });
  });
  await page.route("**/api/student/conversations/conversation-ppt-intent/messages", async (route) => {
    const input = route.request().postDataJSON();
    return json(route, {
      id: input.clientMessageId,
      ...input,
      ideaId: idea.id,
      conversationId: conversation.id,
      createdAt: "2026-07-31T10:05:00",
    });
  });
  await page.route("**/api/student/ideas/idea-ppt-intent", async (route) => {
    const input = route.request().postDataJSON();
    return json(route, { ...idea, ...input, updatedAt: "2026-07-31T10:06:00" });
  });
  await page.route("**/api/student/artifacts", async (route) => {
    if (route.request().method() === "GET") return json(route, []);
    const input = route.request().postDataJSON();
    return json(route, {
      id: "artifact-ppt-intent",
      ...input,
      fileAvailable: false,
      createdAt: "2026-07-31T10:06:00",
      updatedAt: "2026-07-31T10:06:00",
    });
  });
  await page.route("**/api/provider/deepseek/chat", async (route) => {
    providerInput = route.request().postDataJSON();
    return json(route, {
      content: "已按现有项目材料整理为十页路演结构；尚缺的访谈和试点数据已标记为待补充。",
      assistantMessageId: "ai-ppt-intent",
      artifactType: "PPT",
      blocks: [
        { title: "01 项目愿景", items: ["用 AI 降低学生完成创业实践任务的门槛", "展示课程场景与教学价值"] },
        { title: "02 用户痛点", items: ["学生缺少持续、个性化、可复盘的过程反馈", "教师缺少可审核的阶段成果"] },
        { title: "03 解决方案", items: ["学生生成、教师审核、成果沉淀组成教学闭环", "访谈和试点数据待补充"] },
      ],
    });
  });

  await login(page);
  await page.getByLabel("和 AI 助教对话").fill("我们的材料已经差不多了，帮我整理成一套路演展示，控制在十页左右。");
  await page.getByRole("button", { name: "发送", exact: true }).click();

  await expect(page.getByText("本轮阶段成果")).toBeVisible();
  await expect(page.getByText("01 项目愿景")).toBeVisible();
  await expect(page.getByText("02 用户痛点")).toBeVisible();
  await expect(page.getByRole("button", { name: "预览 PPT" })).toBeVisible();
  await expect(page.getByRole("button", { name: "下载 PPTX" })).toBeVisible();
  expect(providerInput).toMatchObject({
    ideaId: idea.id,
    expertId: "pitch",
    artifactType: "PPT",
    artifactMode: "AUTO",
  });
});

test("刷新后把未完成回复显示在对话内且不弹阻塞窗口", async ({ page }) => {
  const idea = {
    id: "idea-failed-recovery",
    title: "路演恢复测试",
    description: "验证失败请求恢复体验",
    stage: "路演准备",
    createdAt: "2026-07-31T10:00:00",
    updatedAt: "2026-07-31T10:00:00",
  };
  const pendingMessage = {
    id: "message-failed-recovery",
    clientMessageId: "message-failed-recovery",
    ideaId: idea.id,
    conversationId: "conversation-failed-recovery",
    sender: "USER",
    inputMode: "文本",
    content: "帮我整理成十页路演展示。",
    createdAt: "2026-07-31T10:05:00",
  };
  const conversation = {
    id: "conversation-failed-recovery",
    ideaId: idea.id,
    selectedExpertId: "pitch",
    selectedSkillId: "deck",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [pendingMessage],
    updatedAt: "2026-07-31T10:05:00",
  };

  await page.route("**/api/student/workspace", (route) => json(route, { ideas: [idea], conversations: [conversation] }));
  await page.route("**/api/provider/deepseek/chat-status?*", (route) =>
    json(route, {
      status: "FAILED",
      errorMessage: "DeepSeek 返回了无法识别的响应：响应缺少生成内容",
    }),
  );

  await login(page);

  await expect(page.getByLabel("正式回复").getByText(/本次模型没有形成正式回复/)).toBeVisible();
  await expect(page.getByRole("dialog", { name: /上次 AI 回复未完成|系统提示/ })).toHaveCount(0);
  await expect(page.getByText("帮我整理成十页路演展示。")).toBeVisible();
});
