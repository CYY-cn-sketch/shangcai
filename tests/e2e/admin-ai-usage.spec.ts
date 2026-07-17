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

test("管理员可按个人和小组查看真实 Token 用量", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  if (testInfo.project.name === "desktop-chromium") {
    await page.setViewportSize({ width: 2048, height: 1152 });
  }
  await page.goto("/");

  await page.getByRole("button", { name: "教师端" }).click();
  await page.getByLabel("账号").fill("admin@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();

  await expect(page.locator(".admin-console-layout")).toBeVisible();
  await page.getByRole("button", { name: "AI 用量统计" }).click();
  await expect(page.getByRole("heading", { name: "AI Token 用量" })).toBeVisible();
  if (testInfo.project.name === "desktop-chromium") {
    const navigationHeight = await page.locator(".admin-console-side").evaluate((element) => element.getBoundingClientRect().height);
    expect(navigationHeight).toBeLessThanOrEqual(90);
  }
  await expect(page.getByText("暂无真实 Token 用量")).toBeVisible();
  await expect(page.getByLabel("统计周期")).toHaveValue("LAST_30_DAYS");

  await page.getByRole("button", { name: "按小组" }).click();
  await expect(page.getByRole("button", { name: "按小组" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("统计周期").selectOption("LAST_7_DAYS");
  await expect(page.getByLabel("统计周期")).toHaveValue("LAST_7_DAYS");
  await expect(page.getByText("暂无真实 Token 用量")).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`admin-ai-usage-${testInfo.project.name}.png`), fullPage: true });
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
