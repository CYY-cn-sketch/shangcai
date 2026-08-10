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
  await expect(page.getByRole("heading", { name: "AI 与生成服务用量" })).toBeVisible();
  await expect(page.getByText("Token 是模型计量单位", { exact: false })).toBeVisible();
  const usageSummary = page.getByLabel("Token 用量汇总");
  await expect(usageSummary.locator("dd").nth(0)).toContainText(/Token$/);
  await expect(usageSummary.locator("dd").nth(1)).toContainText(/Token$/);
  await expect(usageSummary.locator("dd").nth(2)).toContainText(/Token$/);
  await expect(usageSummary.locator("dd").nth(3)).toContainText(/次$/);
  await expect(usageSummary.locator("dd").nth(4)).toContainText(/人$/);
  await expect(usageSummary.locator("dd").nth(5)).toContainText(/组$/);
  if (testInfo.project.name === "desktop-chromium") {
    const navigationHeight = await page.locator(".admin-console-side").evaluate((element) => element.getBoundingClientRect().height);
    expect(navigationHeight).toBeLessThanOrEqual(90);
  }
  await expect(page.getByLabel("供应商调用汇总")).toContainText("DeepSeek 对话");
  await expect(page.getByLabel("供应商调用汇总")).toContainText("乐享 PPT");
  await expect(page.getByLabel("供应商调用汇总")).toContainText("WorkBuddy 视频");
  await expect(page.getByLabel("统计周期")).toHaveValue("LAST_30_DAYS");

  await page.getByRole("button", { name: "按小组" }).click();
  await expect(page.getByRole("button", { name: "按小组" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("统计周期").selectOption("LAST_7_DAYS");
  await expect(page.getByLabel("统计周期")).toHaveValue("LAST_7_DAYS");
  const groupRows = page.locator(".ai-usage-groups-table article.table-row");
  await expect.poll(async () => groupRows.count()).toBeGreaterThan(0);
  await expect(page.locator(".ai-usage-groups-table")).toContainText("第 1 组");
  await expect(page.locator(".ai-usage-groups-table")).toContainText("第 2 组");
  await expect(page.getByText("尚未创建项目小组")).toHaveCount(0);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`admin-ai-usage-${testInfo.project.name}.png`), fullPage: true });

  const monitorPagePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "运行监控中心" }).click();
  const monitorPage = await monitorPagePromise;
  await monitorPage.waitForLoadState("domcontentloaded");
  await expect(monitorPage.getByRole("heading", { name: "运行监控中心" })).toBeVisible();
  await expect(monitorPage.locator("#dataSource")).toContainText("MYSQL / BACKEND");
  await monitorPage.screenshot({ path: testInfo.outputPath(`admin-live-monitor-${testInfo.project.name}.png`), fullPage: true });
  await monitorPage.close();

  await page.getByRole("button", { name: "试点运营评估" }).click();
  await expect(page.getByRole("heading", { name: "试点运营评估", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看系统数据汇总详情" })).toBeVisible();
  await expect(page.getByLabel("运营评估数据来源")).toContainText("系统汇总");
  await page.screenshot({ path: testInfo.outputPath(`admin-pilot-evaluation-${testInfo.project.name}.png`), fullPage: true });
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
