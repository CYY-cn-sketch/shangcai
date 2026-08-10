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

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(!password, "需要通过 SUFE_E2E_PASSWORD 提供专用测试密码");
  test.skip(testInfo.project.name !== "desktop-chromium", "专家下拉顺序在桌面端验收");
});

test("项目定位专家紧跟在创意头脑风暴专家之后", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  await page.goto("/");
  await page.getByLabel("账号").fill("student@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("选择专家").click();
  const options = page.getByRole("listbox", { name: "选择专家" }).getByRole("option");
  const labels = (await options.allTextContents()).map((label) => label.trim());
  const brainstormIndex = labels.indexOf("创意头脑风暴专家");
  const positioningIndex = labels.indexOf("项目定位专家");

  expect(brainstormIndex).toBeGreaterThanOrEqual(0);
  expect(positioningIndex).toBe(brainstormIndex + 1);
  await expect(options.nth(brainstormIndex)).toHaveText("创意头脑风暴专家");
  await expect(options.nth(positioningIndex)).toHaveText("项目定位专家");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("expert-order.png"), fullPage: true });

  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
