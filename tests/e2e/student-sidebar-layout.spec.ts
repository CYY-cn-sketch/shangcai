import { expect, test, type Page, type Route } from "@playwright/test";

const now = "2026-08-05T09:00:00Z";
const studentSession = {
  id: "student-sidebar-layout",
  role: "student",
  name: "侧栏布局测试学生",
  account: "student-sidebar-layout@sufe.test",
  title: "学生",
  avatarId: "student-1",
  groupId: "group-sidebar-layout",
  groupLabel: "测试组",
  groupName: "侧栏布局测试组",
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
];

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

function buildWorkspace() {
  const ideas = Array.from({ length: 7 }, (_, ideaIndex) => ({
    id: `idea-sidebar-${ideaIndex + 1}`,
    title: `创意项目 ${ideaIndex + 1}：这是用于验证窄侧栏标题截断和项目分组自然高度的长标题`,
    description: `第 ${ideaIndex + 1} 个侧栏布局回归项目`,
    stage: ideaIndex % 2 === 0 ? "创意头脑风暴" : "商业模式设计",
    createdAt: now,
    updatedAt: now,
  }));
  const conversations = ideas.flatMap((idea, ideaIndex) =>
    Array.from({ length: 3 }, (_, conversationIndex) => {
      const sequence = conversationIndex + 1;
      const id = `conversation-sidebar-${ideaIndex + 1}-${sequence}`;
      return {
        id,
        ideaId: idea.id,
        title: `第 ${sequence} 轮专家协作对话：验证长标题不会被删除按钮遮挡`,
        status: "ACTIVE",
        selectedExpertId: conversationIndex % 2 === 0 ? "pitch" : "business",
        selectedSkillId: conversationIndex % 2 === 0 ? "deck" : "bp",
        modelMode: "Auto",
        knowledgeSelection: { categories: [], uploadIds: [] },
        messages: [{
          id: `message-${id}`,
          clientMessageId: `client-${id}`,
          ideaId: idea.id,
          conversationId: id,
          sender: "AI",
          expertId: conversationIndex % 2 === 0 ? "pitch" : "business",
          expertName: conversationIndex % 2 === 0 ? "路演 PPT 专家" : "商业模式/BP 专家",
          content: "这是一段足够长的对话摘要，用来确认摘要会在卡片内部省略，不会撑破项目分组或覆盖相邻内容。",
          createdAt: now,
        }],
        createdAt: now,
        lastMessageAt: now,
        updatedAt: now,
      };
    }),
  );
  return { ideas, conversations };
}

async function openStudentWorkspace(page: Page) {
  await page.goto("/");
  await expect(page.locator(".buddy-shell")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".buddy-project-group")).toHaveCount(7);
}

async function expectHealthySidebar(page: Page) {
  const history = page.locator(".buddy-history");
  const layout = await history.evaluate((historyElement) => {
    const sidebar = historyElement.closest<HTMLElement>(".buddy-sidebar");
    const head = sidebar?.querySelector<HTMLElement>(".buddy-sidebar-head");
    const actions = sidebar?.querySelector<HTMLElement>(".buddy-sidebar-actions");
    const search = sidebar?.querySelector<HTMLElement>(".buddy-conversation-search");
    const footer = sidebar?.querySelector<HTMLElement>(".buddy-sidebar-foot");
    if (!sidebar || !head || !actions || !search || !footer) throw new Error("侧栏结构不完整");

    const sidebarRect = sidebar.getBoundingClientRect();
    const historyRect = historyElement.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const groups = Array.from(historyElement.querySelectorAll<HTMLElement>(".buddy-project-group"));
    const groupBounds = groups.map((group) => {
      const rect = group.getBoundingClientRect();
      return {
        top: rect.top - historyRect.top + historyElement.scrollTop,
        bottom: rect.bottom - historyRect.top + historyElement.scrollTop,
        clientHeight: group.clientHeight,
        scrollHeight: group.scrollHeight,
      };
    });
    const textAndDeleteBounds = Array.from(
      historyElement.querySelectorAll<HTMLElement>(".buddy-conversation-row"),
    ).map((row) => {
      const title = row.querySelector<HTMLElement>(".buddy-conversation-item strong");
      const summary = row.querySelector<HTMLElement>(".buddy-conversation-item p");
      const deleteButton = row.querySelector<HTMLElement>(".buddy-conversation-delete");
      if (!title || !summary || !deleteButton) throw new Error("对话卡片结构不完整");
      return {
        titleRight: title.getBoundingClientRect().right,
        summaryRight: summary.getBoundingClientRect().right,
        deleteLeft: deleteButton.getBoundingClientRect().left,
      };
    });

    return {
      overflowY: getComputedStyle(historyElement).overflowY,
      clientHeight: historyElement.clientHeight,
      scrollHeight: historyElement.scrollHeight,
      sidebar: { top: sidebarRect.top, bottom: sidebarRect.bottom },
      head: { top: headRect.top, bottom: headRect.bottom },
      actions: { top: actionsRect.top, bottom: actionsRect.bottom },
      search: { top: searchRect.top, bottom: searchRect.bottom },
      history: { top: historyRect.top, bottom: historyRect.bottom },
      footer: { top: footerRect.top, bottom: footerRect.bottom },
      groupBounds,
      textAndDeleteBounds,
    };
  });

  expect(layout.overflowY).toBe("auto");
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);
  expect(layout.head.top).toBeGreaterThanOrEqual(layout.sidebar.top - 1);
  expect(layout.actions.top).toBeGreaterThanOrEqual(layout.head.bottom - 1);
  expect(layout.search.top).toBeGreaterThanOrEqual(layout.actions.bottom - 1);
  expect(layout.history.top).toBeGreaterThanOrEqual(layout.search.bottom - 1);
  expect(layout.footer.top).toBeGreaterThanOrEqual(layout.history.bottom - 1);
  expect(layout.footer.bottom).toBeLessThanOrEqual(layout.sidebar.bottom + 1);

  for (let index = 0; index < layout.groupBounds.length - 1; index += 1) {
    expect(layout.groupBounds[index].bottom).toBeLessThanOrEqual(layout.groupBounds[index + 1].top + 1);
  }
  for (const group of layout.groupBounds) {
    expect(group.scrollHeight).toBeLessThanOrEqual(group.clientHeight + 1);
  }
  for (const row of layout.textAndDeleteBounds) {
    expect(row.titleRight).toBeLessThanOrEqual(row.deleteLeft - 2);
    expect(row.summaryRight).toBeLessThanOrEqual(row.deleteLeft - 2);
  }

  await history.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect.poll(() => history.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator(".buddy-sidebar-head")).toBeInViewport();
  await expect(page.locator(".buddy-sidebar-actions")).toBeInViewport();
  await expect(page.locator(".buddy-conversation-search")).toBeInViewport();
  await expect(page.locator(".buddy-sidebar-foot")).toBeInViewport();

  const firstDelete = page.locator(".buddy-conversation-delete").first();
  await expect(firstDelete).toHaveAccessibleName(/删除对话/);
  const deleteSize = await firstDelete.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(deleteSize.width).toBeGreaterThanOrEqual(24);
  expect(deleteSize.height).toBeGreaterThanOrEqual(24);
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "侧栏布局在桌面端验收");

  const workspace = buildWorkspace();
  await page.addInitScript(() => {
    const retention = JSON.stringify({ expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    window.sessionStorage.setItem("sufe.auth.tab-retention", retention);
    window.localStorage.setItem("sufe.auth.device-retention", retention);
  });
  await page.route("**/api/auth/session", (route) => json(route, studentSession));
  await page.route("**/api/student/workspace", (route) => json(route, workspace));
  await page.route("**/api/student/artifacts", (route) => json(route, []));
  await page.route("**/api/student/submissions", (route) => json(route, []));
  await page.route("**/api/student/defense-practices", (route) => json(route, []));
  await page.route("**/api/student/handoffs**", (route) => json(route, []));
  await page.route("**/api/knowledge/knowledge-bases", (route) => json(route, []));
  await page.route("**/api/knowledge/knowledge-assets", (route) => json(route, []));
  await page.route("**/api/knowledge/experts", (route) => json(route, knowledgeExperts));
});

test("多个创意和多轮对话只在列表区滚动且项目分组不重叠", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudentWorkspace(page);
  await expectHealthySidebar(page);
  await page.screenshot({ path: testInfo.outputPath("student-sidebar-desktop.png"), fullPage: false });

  await page.setViewportSize({ width: 1100, height: 820 });
  await expectHealthySidebar(page);
  await page.screenshot({ path: testInfo.outputPath("student-sidebar-narrow.png"), fullPage: false });
});
