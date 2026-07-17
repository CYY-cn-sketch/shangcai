import { expect, test, type Page } from "@playwright/test";

const password = process.env.SUFE_E2E_PASSWORD || "";

function collectFailures(page: Page) {
  const consoleErrors: string[] = [];
  const httpFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) httpFailures.push(`${response.status()} ${response.url()}`);
  });
  return { consoleErrors, httpFailures };
}

test.beforeEach(() => {
  test.skip(!password, "需要通过 SUFE_E2E_PASSWORD 提供专用测试密码");
});

test("学生登录、受保护页面和退出流程不产生 HTTP 失败", async ({ page }) => {
  const failures = collectFailures(page);
  await page.goto("/");

  await expect(page).toHaveTitle("上海财经大学商学院 AI 赋能创业实践教学示范平台");
  await page.getByLabel("账号").fill("student@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/overflow/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole("button", { name: "退出登录" }).click();
  await page.getByRole("button", { name: "确认退出" }).click();
  await expect(page.locator(".login-page")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});

test("教师账号进入教师端且页面保持可访问名称", async ({ page }) => {
  const failures = collectFailures(page);
  await page.goto("/");

  await page.getByRole("button", { name: "教师端" }).click();
  await page.getByLabel("账号").fill("teacher@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.waitForLoadState("networkidle");

  const unnamedButtons = await page.locator("button").evaluateAll((buttons) =>
    buttons.filter((button) => !((button.textContent || "").trim() || button.getAttribute("aria-label") || button.getAttribute("title"))).length,
  );
  expect(unnamedButtons).toBe(0);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
