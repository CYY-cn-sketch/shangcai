import { expect, test, type Page, type Route } from "@playwright/test";

const studentSession = {
  id: "student-defense-e2e",
  role: "student",
  name: "答辩测试学生",
  account: "student-defense-e2e@sufe.test",
  title: "学生",
  avatarId: "student-boy",
  quota: 100,
  lexiangPptQuota: 10,
  workbuddyVideoQuota: 10,
  disabledPermissions: [],
};

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "答辩对话归属先在桌面端验收");
  await page.addInitScript(() => {
    const retention = JSON.stringify({ expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    window.sessionStorage.setItem("sufe.auth.tab-retention", retention);
    window.localStorage.setItem("sufe.auth.device-retention", retention);
  });
});

test("答辩模拟仅在明确点击时调用 AI，并用真实轮次生成评价和下一轮建议", async ({ page }) => {
  let providerCalls = 0;
  let defenseMessageWrites = 0;
  let ideaLevelMessageWrites = 0;
  const idea = {
    id: "idea-defense-qa",
    title: "创业实践教学助手",
    description: "帮助学生形成可审核、可修改和可沉淀的阶段成果",
    stage: "答辩准备",
    createdAt: "2026-07-28T10:00:00",
    updatedAt: "2026-07-28T10:00:00",
  };
  const bpMessage = {
    id: "ai-bp-qa",
    clientMessageId: "ai-bp-qa",
    ideaId: idea.id,
    conversationId: "conversation-business-qa",
    sender: "AI",
    inputMode: "文本",
    expertId: "business",
    expertName: "商业模式/BP 专家",
    skillName: "商业计划书",
    artifactType: "BP",
    content: "商业计划书已形成，收费与采购证据仍需验证。",
    blocks: [
      { title: "执行摘要", items: ["面向创业实践课程提供阶段成果闭环。"] },
      { title: "商业模式", items: ["以课程试点包验证采购价值。"] },
    ],
    createdAt: "2026-07-28T10:05:00",
  };
  const activeConversation = {
    id: "conversation-pitch-qa",
    ideaId: idea.id,
    title: "当前路演对话",
    status: "ACTIVE",
    selectedExpertId: "pitch",
    selectedSkillId: "deck",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [],
    createdAt: "2026-07-28T10:00:00",
    lastMessageAt: "2026-07-28T10:01:00",
    updatedAt: "2026-07-28T10:01:00",
  };
  const businessConversation = {
    id: "conversation-business-qa",
    ideaId: idea.id,
    title: "商业计划书对话",
    status: "ACTIVE",
    selectedExpertId: "business",
    selectedSkillId: "bp",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [bpMessage],
    createdAt: "2026-07-28T10:02:00",
    lastMessageAt: "2026-07-28T10:05:00",
    updatedAt: "2026-07-28T10:05:00",
  };
  const defenseConversation = {
    id: "conversation-defense-expert-qa",
    ideaId: idea.id,
    title: "答辩专家对话",
    status: "ACTIVE",
    selectedExpertId: "defense",
    selectedSkillId: "defense",
    modelMode: "Auto",
    knowledgeSelection: { categories: [], uploadIds: [] },
    messages: [],
    createdAt: "2026-07-28T10:03:00",
    lastMessageAt: null,
    updatedAt: "2026-07-28T10:03:00",
  };

  await page.route("**/api/auth/session", (route) => json(route, studentSession));
  await page.route("**/api/auth/csrf", (route) => json(route, { headerName: "X-CSRF-TOKEN", token: "test-token" }));
  await page.route("**/api/student/workspace", (route) => json(route, {
    ideas: [idea],
    conversations: [activeConversation, businessConversation, defenseConversation],
  }));
  await page.route("**/api/student/artifacts", (route) => json(route, []));
  await page.route("**/api/student/submissions", (route) => json(route, []));
  await page.route("**/api/student/defense-practices", (route) => json(route, []));
  await page.route("**/api/student/handoffs**", (route) => json(route, [
    {
      id: "handoff-bp-confirmed",
      ideaId: idea.id,
      sourceArtifactId: "artifact-bp-confirmed",
      sourceExpertId: "business",
      targetExpertId: "ALL",
      status: "CONFIRMED",
      payload: {
        kind: "CONFIRMED_STAGE_ARTIFACT",
        schemaVersion: 1,
        sourceExpertId: "business",
        sourceMessageId: bpMessage.id,
        ideaId: idea.id,
        artifactType: "BP",
        title: "已确认的商业计划书 BP",
        summary: "课程试点包的收费与采购证据仍需验证",
        content: { blocks: bpMessage.blocks },
      },
      confirmedAt: "2026-07-28T10:06:00Z",
      createdAt: "2026-07-28T10:06:00Z",
      updatedAt: "2026-07-28T10:06:00Z",
    },
  ]));
  await page.route("**/api/knowledge/knowledge-bases", (route) => json(route, []));
  await page.route("**/api/knowledge/knowledge-assets", (route) => json(route, []));
  await page.route("**/api/knowledge/experts", (route) => json(route, [
    {
      id: "pitch",
      name: "路演 PPT 专家",
      role: "将 BP 转换为路演结构",
      scenario: "路演 PPT",
      accent: "#005aa8",
      active: true,
      skills: [{ id: "deck", name: "路演 PPT", stage: "路演", description: "生成路演结构" }],
      knowledgeCategories: [],
    },
    {
      id: "business",
      name: "商业模式/BP 专家",
      role: "整理商业计划书",
      scenario: "商业计划书",
      accent: "#22406a",
      active: true,
      skills: [{ id: "bp", name: "商业计划书", stage: "BP", description: "生成 BP" }],
      knowledgeCategories: [],
    },
    {
      id: "defense",
      name: "AI 评委/答辩陪练专家",
      role: "模拟答辩追问",
      scenario: "答辩模拟",
      accent: "#7a2e2e",
      active: true,
      skills: [{ id: "defense", name: "答辩模拟", stage: "答辩", description: "生成追问" }],
      knowledgeCategories: [],
    },
  ]));
  await page.route("**/api/student/ideas/idea-defense-qa/messages", async (route) => {
    ideaLevelMessageWrites += 1;
    return json(route, {});
  });
  await page.route("**/api/student/conversations/conversation-defense-expert-qa/messages", async (route) => {
    defenseMessageWrites += 1;
    const input = route.request().postDataJSON();
    return json(route, {
      id: input.clientMessageId,
      ...input,
      ideaId: idea.id,
      conversationId: defenseConversation.id,
      createdAt: "2026-07-28T10:06:00",
    });
  });
  await page.route("**/api/student/defense-practices/**", async (route) => {
    const input = route.request().postDataJSON();
    return json(route, {
      id: route.request().url().split("/").at(-1),
      ideaId: input.ideaId,
      visibility: input.visibility,
      content: input.content,
      createdAt: "2026-07-28T10:10:00",
      updatedAt: "2026-07-28T10:10:00",
    });
  });
  await page.route("**/api/provider/deepseek/chat", async (route) => {
    providerCalls += 1;
    const input = route.request().postDataJSON();
    if (input.artifactType === "DEFENSE") {
      return json(route, {
        content: "【正式回复】本轮答辩已完成，评价仅依据刚才的真实回答。",
        assistantMessageId: "ai-defense-evaluation",
        blocks: [
          {
            title: "综合评分",
            items: [
              "总分：86/100",
              "项目逻辑：18/20",
              "用户与痛点：13/15",
              "商业模式：17/20",
              "市场与竞争：12/15",
              "证据可信度：17/20",
              "表达与应答：9/10",
            ],
          },
          { title: "综合评价", items: ["能够说明课程闭环，但学校采购证据仍不足。"] },
          { title: "下一轮修改建议", items: ["补充采购方访谈、预算科目和试点验收指标。"] },
          { title: "下一轮答辩训练", items: ["用结论、证据、风险和验证动作四步回答采购问题。"] },
        ],
      });
    }
    return json(route, {
      content: providerCalls === 1
        ? "【正式回复】第一问：学校为什么愿意采购课程试点包，而不是让学生直接使用通用 AI？"
        : "【正式回复】当前回答说明了教学闭环，但缺少采购证据。下一问：你准备如何验证预算来源和验收指标？",
      assistantMessageId: `ai-defense-${providerCalls}`,
    });
  });

  await openApp(page);
  await page.getByRole("button", { name: "答辩模拟", exact: true }).click();
  await expect(page.getByRole("heading", { name: /答辩模拟：创业实践教学助手/ })).toBeVisible();
  await expect(page.locator(".auto-basis-card")).toContainText("已确认的商业计划书 BP");
  await expect(page.locator(".auto-basis-card")).toContainText("确认时间");
  expect(providerCalls).toBe(0);

  await page.getByRole("button", { name: "开始答辩" }).click();
  await expect(page.getByText(/学校为什么愿意采购课程试点包/)).toBeVisible();
  expect(providerCalls).toBe(1);

  await page.getByLabel("输入答辩回答").fill("学校采购的是课程模板、教师审核、过程数据和成果沉淀组成的教学闭环。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await expect(page.getByText(/如何验证预算来源和验收指标/)).toBeVisible();
  expect(providerCalls).toBe(2);

  await page.getByRole("button", { name: "结束并生成评价" }).click();
  const evaluationMessage = page.getByRole("region", { name: "答辩综合评价" });
  await expect(evaluationMessage).toContainText("86/100");
  await expect(evaluationMessage).toContainText("采购方访谈");
  await expect(evaluationMessage).toContainText("项目逻辑");
  await expect(page.locator(".defense-evaluation-panel")).toHaveCount(0);
  await page.waitForTimeout(800);
  expect(providerCalls).toBe(3);
  expect(defenseMessageWrites).toBe(3);
  expect(ideaLevelMessageWrites).toBe(0);
});
