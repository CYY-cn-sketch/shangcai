import { expect, test, type Page } from "@playwright/test";

const password = process.env.SUFE_E2E_PASSWORD || "";

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

async function login(page: Page, account: string, roleButton?: string) {
  await page.goto("/");
  if (roleButton) await page.getByRole("button", { name: roleButton }).click();
  await page.getByLabel("账号").fill(account);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 30_000 });
}

async function mockExpertSkillSource(page: Page, expertId: string, folderName: string) {
  await page.route(`**/api/knowledge/expert-skill-uploads/experts/${expertId}/files`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sourceType: "STARTER",
        folderName,
        mainFilePath: `starter-content/experts/${folderName}/SKILL.md`,
        uploadedBy: "system",
        updatedAt: null,
        files: [
          {
            id: `${expertId}-skill`,
            relativePath: `starter-content/experts/${folderName}/SKILL.md`,
            fileRole: "PROMPT",
            contentText: `# ${expertId} 专家\n\n## 系统提示词\n只根据已确认的信息回答。`,
            contentTruncated: false,
            mimeType: "text/markdown",
            fileSizeBytes: 92,
            sha256: "test-skill-sha256",
            importedAssetId: null,
            downloadUrl: null,
          },
          {
            id: `${expertId}-example`,
            relativePath: `starter-content/experts/${folderName}/examples/真实使用样例.md`,
            fileRole: "REFERENCE",
            contentText: "# 真实使用样例\n\n学生输入与期望输出示例。",
            contentTruncated: false,
            mimeType: "text/markdown",
            fileSizeBytes: 64,
            sha256: "test-example-sha256",
            importedAssetId: null,
            downloadUrl: null,
          },
        ],
      }),
    });
  });
}

async function expectViewportModal(page: Page) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect(page.locator("body > .expert-detail-backdrop")).toBeVisible();
  const backdropBox = await page.locator(".expert-detail-backdrop").boundingBox();
  const dialogBox = await page.locator(".expert-detail-modal").boundingBox();
  expect(backdropBox).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(backdropBox!.x).toBeLessThanOrEqual(1);
  expect(backdropBox!.y).toBeLessThanOrEqual(1);
  expect(backdropBox!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(backdropBox!.height).toBeGreaterThanOrEqual(viewport!.height - 1);
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);
}

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(!password, "需要通过 SUFE_E2E_PASSWORD 提供专用测试密码");
  test.skip(testInfo.project.name !== "desktop-chromium", "本轮按用户要求仅验收桌面端");
});

test("学生端把回答方式与成果类型分开呈现", async ({ page }) => {
  const failures = collectUnexpectedFailures(page);
  await login(page, "student@sufe.demo");

  await expect(page.getByText("成果路线：")).toBeVisible();
  await expect(page.getByText(/平台知识库生成逐页内容，平台组装并保存 PPTX/)).toBeVisible();
  const answerMode = page.getByLabel("选择回答方式");
  await expect(answerMode).toContainText("Auto（自动）");
  await answerMode.click();
  await expect(page.getByRole("option", { name: "快速生成" })).toBeVisible();
  await expect(page.getByRole("option", { name: "深度分析" })).toBeVisible();
  await expect(page.getByText("多模态增强", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});

test("教师端专家页只展示专家列表，详情通过弹窗查看", async ({ page }) => {
  const failures = collectUnexpectedFailures(page);
  await mockExpertSkillSource(page, "brainstorm", "brainstorm-expert");
  await login(page, "teacher@sufe.demo", "教师端");
  await page.getByRole("button", { name: "专家配置与 Skill 管理" }).click();

  await expect(page.getByRole("heading", { name: "专家列表" })).toBeVisible();
  await expect(page.getByText("回答方式由平台统一注入")).toHaveCount(0);
  await page.getByRole("button", { name: /创意头脑风暴专家.*查看详情/ }).click();
  const detail = page.getByRole("dialog", { name: "创意头脑风暴专家" });
  await expect(detail).toContainText("适用场景");
  await expect(detail).toContainText("系统提示词");
  await expect(detail).toContainText("用户输入组装规则");
  await expect(detail).toContainText("Skill 包来源档案");
  await expect(detail.getByRole("button", { name: /SKILL\.md/ })).toBeVisible();
  await expect(detail.locator(".expert-skill-file-preview pre")).toContainText("系统提示词");
  await detail.getByRole("button", { name: /真实使用样例\.md/ }).click();
  await expect(detail.locator(".expert-skill-file-preview pre")).toContainText("学生输入与期望输出示例");
  await expect(detail).not.toContainText("Auto（自动）");
  await expect(detail.getByRole("switch", { name: "学生端启用" })).toBeVisible();
  await expectViewportModal(page);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});

test("管理端从专家列表打开详情且不展示平台统一模式", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  let savedActive: boolean | null = null;
  let privateKnowledgeUploaded = false;
  const privateKnowledgeCategory = "路演 PPT 专家专属知识库";
  const uploadedAsset = {
    id: "e2e-pitch-private-asset",
    category: privateKnowledgeCategory,
    name: "路演证据补充.txt",
    sizeLabel: "42 B",
    fileType: "TXT",
    preview: "学生访谈证据与路演指标。",
    contentText: "学生访谈证据与路演指标。",
    uploadedBy: "admin@sufe.demo",
    enabled: true,
    fileAvailable: true,
    originalName: "路演证据补充.txt",
    mimeType: "text/plain",
    fileSizeBytes: 42,
    sha256: "a".repeat(64),
    extractionStatus: "READY",
    extractionMessage: "已提取可读文本",
    downloadUrl: "/api/knowledge/knowledge-assets/e2e-pitch-private-asset/file",
    createdAt: "2026-07-31T00:00:00Z",
  };
  await mockExpertSkillSource(page, "pitch", "pitch-expert");
  await page.route("**/api/knowledge/experts/pitch/knowledge-assets/files", async (route) => {
    privateKnowledgeUploaded = true;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(uploadedAsset) });
  });
  await page.route("**/api/knowledge/knowledge-assets", async (route) => {
    const response = await route.fetch();
    const assets = await response.json() as Array<Record<string, unknown>>;
    if (privateKnowledgeUploaded && !assets.some((asset) => asset.id === uploadedAsset.id)) assets.push(uploadedAsset);
    await route.fulfill({ response, json: assets });
  });
  await page.route("**/api/knowledge/knowledge-bases", async (route) => {
    const response = await route.fetch();
    const bases = await response.json() as Array<Record<string, unknown>>;
    if (privateKnowledgeUploaded) {
      bases.forEach((base) => {
        if (base.category === privateKnowledgeCategory) base.assetCount = 1;
      });
    }
    await route.fulfill({ response, json: bases });
  });
  await page.route("**/api/knowledge/experts/pitch", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    savedActive = input.active as boolean;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "pitch", ...input }),
    });
  });
  await login(page, "admin@sufe.demo", "教师端");
  await page.getByRole("button", { name: "专家配置与 Skill 管理" }).click();
  await page.getByRole("button", { name: /路演 PPT 专家.*查看详情/ }).click();
  const detail = page.getByRole("dialog", { name: "路演 PPT 专家" });
  await expect(detail).toContainText("专家 Skill 专属知识库");
  await expect(detail).toContainText("专家调用的课程知识库");
  await expect(detail.getByRole("button", { name: "上传知识资料" })).toBeVisible();
  await expect(detail.locator(".expert-private-files input[type='file']")).toHaveCount(1);
  const privateAssetMetric = detail
    .locator(".expert-skill-knowledge-card > article dl > div")
    .filter({ hasText: /^资料/ });
  const initialAssetCount = Number.parseInt((await privateAssetMetric.textContent())?.match(/\d+/)?.[0] || "0", 10);
  await detail.locator(".expert-private-files input[type='file']").setInputFiles({
    name: uploadedAsset.name,
    mimeType: "text/plain",
    buffer: Buffer.from(uploadedAsset.contentText),
  });
  await expect(detail.getByText(uploadedAsset.name)).toBeVisible();
  await expect(detail.getByText("已读取，可检索").first()).toBeVisible();
  await expect(detail.getByText("已上传 1 个文件，系统已完成保存和正文读取。")).toBeVisible();
  await expect(privateAssetMetric).toContainText(`${initialAssetCount + 1} 个`);
  await expect(detail.locator(".expert-detail-knowledge input[type='checkbox']").first()).toBeVisible();
  await expect(detail).toContainText("系统提示词");
  await expect(detail).not.toContainText("回答方式由平台统一注入");
  await expect(page.getByLabel("选择提示词模式")).toHaveCount(0);
  await expectViewportModal(page);
  await page.screenshot({ path: testInfo.outputPath("admin-answer-mode-policy.png") });
  const activeSwitch = detail.getByRole("switch", { name: "学生端启用" });
  await expect(activeSwitch).toBeChecked();
  await activeSwitch.uncheck();
  await detail.getByRole("button", { name: "保存专家配置" }).click();
  await expect(detail).toBeHidden();
  expect(savedActive).toBe(false);
  const unnamedButtons = await page.locator("button").evaluateAll((buttons) =>
    buttons.filter((button) => !((button.textContent || "").trim() || button.getAttribute("aria-label") || button.getAttribute("title"))).length,
  );
  expect(unnamedButtons).toBe(0);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
