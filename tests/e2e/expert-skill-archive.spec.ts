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
    if (response.status() >= 400 && !expectedAnonymousProbe) {
      httpFailures.push(`${response.status()} ${response.url()}`);
    }
  });
  return { consoleErrors, httpFailures };
}

test.beforeEach(() => {
  test.skip(!password, "需要通过 SUFE_E2E_PASSWORD 提供专用测试密码");
});

test("专家 Skill 支持 ZIP 拖放和文件夹选择的统一五步向导", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => ({
        kind: "directory",
        name: "e2e-skill",
        async *values() {
          yield {
            kind: "file",
            name: "SKILL.md",
            async getFile() {
              return new File(["# E2E Skill"], "SKILL.md", { type: "text/markdown" });
            },
          };
        },
      }),
    });
  });
  const failures = collectUnexpectedFailures(page);
  const uploadRecord = {
    id: "upload-e2e",
    folderName: "e2e-skill",
    mainFilePath: "e2e-skill/SKILL.md",
    fileCount: 4,
    parsedName: "E2E 财务专家",
    parsedRole: "验证项目财务假设",
    parsedScenario: "收入、成本和现金流测算",
    parsedAccent: "#0f7b73",
    parsedSkillName: "财务假设检查",
    parsedSkillDescription: "检查关键假设并给出验证动作",
    parsedSystemPrompt: "只根据课程资料给出建议。",
    parsedUserPrompt: "组合学生输入和项目数据。",
    parsedKnowledgeRule: "只检索已启用资料。",
    parsedOutputFormat: "输出表格和结论。",
    parsedBoundaries: "不执行上传文件。",
    status: "PARSED",
    uploadedBy: "admin@sufe.demo",
    createdAt: "2026-07-17T00:00:00Z",
    files: [
      { id: "prompt-e2e", relativePath: "e2e-skill/SKILL.md", fileRole: "PROMPT", mimeType: "text/markdown", fileSizeBytes: 300, sha256: "a".repeat(64), downloadUrl: "/prompt" },
      { id: "config-e2e", relativePath: "e2e-skill/config.json", fileRole: "CONFIG", mimeType: "application/json", fileSizeBytes: 120, sha256: "b".repeat(64), downloadUrl: "/config" },
      { id: "source-e2e", relativePath: "e2e-skill/scripts/helper.py", fileRole: "SOURCE_CODE", mimeType: "application/octet-stream", fileSizeBytes: 80, sha256: "d".repeat(64), downloadUrl: "/source" },
      { id: "knowledge-e2e", relativePath: "e2e-skill/references/case.md", fileRole: "KNOWLEDGE_CANDIDATE", mimeType: "text/markdown", fileSizeBytes: 500, sha256: "c".repeat(64), downloadUrl: "/knowledge" },
    ],
  };
  let confirmationBody: Record<string, unknown> | null = null;
  let folderUploadSeen = false;
  await page.route("**/api/knowledge/expert-skill-uploads/archive", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(uploadRecord) });
  });
  await page.route("**/api/knowledge/expert-skill-uploads", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    folderUploadSeen = true;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(uploadRecord) });
  });
  await page.route("**/api/knowledge/expert-skill-uploads/upload-e2e/confirm", async (route) => {
    confirmationBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        expert: {
          id: "expert-e2e",
          name: uploadRecord.parsedName,
          role: uploadRecord.parsedRole,
          scenario: uploadRecord.parsedScenario,
          accent: uploadRecord.parsedAccent,
          active: true,
          systemPrompt: uploadRecord.parsedSystemPrompt,
          userPrompt: uploadRecord.parsedUserPrompt,
          skills: [{ id: "skill-e2e", name: uploadRecord.parsedSkillName, stage: "已确认上传", description: uploadRecord.parsedSkillDescription }],
          knowledgeCategories: ["E2E 财务专家知识库"],
        },
        upload: { ...uploadRecord, status: "ENABLED", expertId: "expert-e2e" },
        knowledgeBase: { id: "kb-e2e", category: "E2E 财务专家知识库", description: "E2E 测试资料", usedBy: "E2E 财务专家", active: true },
        importedAssets: [{ id: "asset-e2e", sourceFileId: "knowledge-e2e", name: "case.md", originalName: "case.md", sha256: "c".repeat(64) }],
      }),
    });
  });
  await page.route("**/api/knowledge/expert-skill-uploads/upload-e2e", async (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    await route.fulfill({ status: 204 });
  });
  await page.goto("/");

  await page.getByRole("button", { name: "教师端" }).click();
  await page.getByLabel("账号").fill("admin@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();

  await expect(page.locator(".admin-console-layout")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "专家配置与 Skill 管理" }).click();
  await page.getByRole("button", { name: "上传并配置 Skill" }).click();

  const dialog = page.getByRole("dialog", { name: "专家配置与 Skill 管理" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("第 1 步")).toBeVisible();
  await expect(dialog.getByText("将 Skill ZIP 拖到这里")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "选择 ZIP" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "选择文件夹" })).toBeVisible();
  const stepOneLabel = dialog.locator(".skill-wizard-steps li").first().locator("small");
  const stepOneConnector = dialog.locator(".skill-wizard-step-connector").first();
  const labelBox = await stepOneLabel.boundingBox();
  const connectorBox = await stepOneConnector.boundingBox();
  expect(labelBox).not.toBeNull();
  expect(connectorBox).not.toBeNull();
  expect(connectorBox!.x).toBeGreaterThanOrEqual(labelBox!.x + labelBox!.width);
  await page.screenshot({ path: testInfo.outputPath("expert-skill-upload-step.png") });

  const archiveInput = dialog.locator('input[type="file"][accept*=".zip"]');
  await expect(archiveInput).toHaveCount(1);
  await expect(archiveInput).not.toHaveAttribute("webkitdirectory", /.*/);
  await expect(archiveInput).not.toHaveAttribute("directory", /.*/);
  await expect(archiveInput).not.toHaveAttribute("multiple", /.*/);

  const folderInput = dialog.locator('input[type="file"][webkitdirectory]');
  await expect(folderInput).toHaveCount(1);
  await expect(folderInput).toHaveAttribute("directory", "");
  await expect(folderInput).toHaveAttribute("multiple", "");

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["safe-e2e-fixture"], "e2e-skill.zip", { type: "application/zip" }));
    return transfer;
  });
  await dialog.locator(".skill-wizard-dropzone").dispatchEvent("drop", { dataTransfer });
  await expect(dialog.getByRole("heading", { name: "确认专家信息" })).toBeVisible();
  await dialog.getByRole("button", { name: /上一步/ }).click();
  await expect(dialog.getByText("源码档案（不执行）")).toBeVisible();
  await dialog.getByRole("button", { name: /下一步/ }).click();
  await dialog.getByRole("button", { name: /下一步/ }).click();
  await expect(dialog.getByRole("heading", { name: "配置知识库" })).toBeVisible();
  await dialog.getByRole("radio", { name: /新建知识库并导入/ }).check();
  await expect(dialog.getByText("e2e-skill/references/case.md")).toBeVisible();
  await dialog.getByRole("button", { name: /下一步/ }).click();
  await expect(dialog.getByRole("heading", { name: "检查提示词" })).toBeVisible();
  await dialog.getByRole("button", { name: /下一步/ }).click();
  await expect(dialog.getByRole("heading", { name: "确认启用" })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`expert-skill-archive-${testInfo.project.name}.png`), fullPage: true });
  await dialog.getByRole("button", { name: /确认保存并启用/ }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  expect(confirmationBody).not.toBeNull();
  expect(confirmationBody?.importFileIds).toEqual(["knowledge-e2e"]);

  const successDialog = page.getByRole("dialog", { name: "保存成功" });
  await expect(successDialog).toBeVisible();
  await successDialog.getByRole("button", { name: "确定" }).click();
  await page.getByRole("button", { name: "上传并配置 Skill" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "选择文件夹" }).click();
  await expect(dialog.getByRole("heading", { name: "确认专家信息" })).toBeVisible({ timeout: 15_000 });
  expect(folderUploadSeen).toBe(true);
  await dialog.getByRole("button", { name: "关闭专家 Skill 配置" }).click();
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
