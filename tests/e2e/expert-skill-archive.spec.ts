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

test("专家 Skill 使用平台 ZIP 上传弹窗且不触发文件夹确认", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  await page.goto("/");

  await page.getByRole("button", { name: "教师端" }).click();
  await page.getByLabel("账号").fill("admin@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();

  await expect(page.locator(".admin-console-layout")).toBeVisible();
  await page.getByRole("button", { name: "专家提示词管理" }).click();
  await page.getByRole("button", { name: "上传 Skill 压缩包" }).click();

  await expect(page.getByRole("heading", { name: "上传专家 Skill 压缩包" })).toBeVisible();
  await expect(page.getByText("不再出现浏览器二次确认")).toBeVisible();
  await expect(page.getByRole("button", { name: "选择 ZIP 压缩包" })).toBeVisible();

  const archiveInput = page.locator('input[type="file"][accept*=".zip"]');
  await expect(archiveInput).toHaveCount(1);
  await expect(archiveInput).not.toHaveAttribute("webkitdirectory", /.*/);
  await expect(archiveInput).not.toHaveAttribute("directory", /.*/);
  await expect(archiveInput).not.toHaveAttribute("multiple", /.*/);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`expert-skill-archive-${testInfo.project.name}.png`), fullPage: true });
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
