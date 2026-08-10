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

test("账号详情只汇总两类生成额度并保留三类额度编辑", async ({ page }, testInfo) => {
  const failures = collectUnexpectedFailures(page);
  let restorePlan: {
    url: string;
    body: Record<string, unknown>;
    original: { ai: string; ppt: string; video: string };
  } | null = null;
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.goto("/");

  await page.getByRole("button", { name: "教师端" }).click();
  await page.getByLabel("账号").fill("admin@sufe.demo");
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录进入系统" }).click();

  await expect(page.locator(".admin-console-layout")).toBeVisible();
  const totalQuotaCard = page.locator(".account-summary-grid article").filter({ hasText: "平台服务总额度" });
  await expect(totalQuotaCard).toContainText(/PPT [\d,]+ 次 · 视频 [\d,]+ 次/);
  await expect(totalQuotaCard).not.toContainText(/\bAI\b/);
  const accountRow = page.locator(".account-table article.table-row").filter({ hasText: "student@sufe.demo" });
  await expect(accountRow).toContainText(/AI \d+\/\d+/);
  await expect(accountRow).toContainText(/PPT \d+\/\d+/);
  await expect(accountRow).toContainText(/视频 \d+\/\d+/);
  const dialog = page.getByRole("dialog", { name: "账号详情" });
  const openStudentAccount = async () => {
    await page.locator(".account-table article.table-row")
      .filter({ hasText: "student@sufe.demo" })
      .getByRole("button", { name: "查看详情" })
      .click();
    await expect(dialog).toBeVisible();
  };

  try {
    await openStudentAccount();
    const quotaSummary = dialog.locator('section[aria-label="账号服务调用额度"]');
    await expect(quotaSummary.locator("article")).toHaveCount(2);
    await expect(quotaSummary).not.toContainText("AI 对话调用");
    await expect(quotaSummary).toContainText("乐享 PPT 生成");
    await expect(quotaSummary).toContainText("WorkBuddy 视频生成");
    const aiQuotaInput = dialog.getByLabel("AI 对话调用额度");
    const pptQuotaInput = dialog.getByLabel("乐享 PPT 生成额度");
    const videoQuotaInput = dialog.getByLabel("WorkBuddy 视频额度");
    await expect(aiQuotaInput).toBeVisible();
    const original = {
      ai: await aiQuotaInput.inputValue(),
      ppt: await pptQuotaInput.inputValue(),
      video: await videoQuotaInput.inputValue(),
    };
    const edited = {
      ai: String(Number(original.ai) + 7),
      ppt: String(Number(original.ppt) + 3),
      video: String(Number(original.video) + 2),
    };
    expect(Object.values(original).every((value) => /^\d+$/.test(value))).toBe(true);

    await aiQuotaInput.fill(edited.ai);
    await pptQuotaInput.fill(edited.ppt);
    await videoQuotaInput.fill(edited.video);
    const saveResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "PATCH" && /\/api\/admin\/accounts\/[^/]+$/.test(response.url()),
    );
    await dialog.getByRole("button", { name: "保存修改" }).click();
    const saveResponse = await saveResponsePromise;
    const savedBody = saveResponse.request().postDataJSON() as Record<string, unknown>;
    restorePlan = {
      url: new URL(saveResponse.url()).pathname,
      body: {
        ...savedBody,
        quotaRemaining: Number(original.ai),
        lexiangPptQuota: Number(original.ppt),
        workbuddyVideoQuota: Number(original.video),
      },
      original,
    };
    expect(saveResponse.ok()).toBe(true);
    expect(savedBody).toMatchObject({
      quotaRemaining: Number(edited.ai),
      lexiangPptQuota: Number(edited.ppt),
      workbuddyVideoQuota: Number(edited.video),
    });
    await expect(page.getByText("账号信息已保存到数据库。", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator(".admin-console-layout")).toBeVisible();
    await openStudentAccount();
    await expect(dialog.getByLabel("AI 对话调用额度")).toHaveValue(edited.ai);
    await expect(dialog.getByLabel("乐享 PPT 生成额度")).toHaveValue(edited.ppt);
    await expect(dialog.getByLabel("WorkBuddy 视频额度")).toHaveValue(edited.video);

    const modalLayout = await dialog.evaluate((element) => {
      const header = element.querySelector(":scope > header") as HTMLElement;
      const body = element.querySelector(".account-modal-body") as HTMLElement;
      const footer = element.querySelector(":scope > footer") as HTMLElement;
      const summary = element.querySelector(".account-detail-summary") as HTMLElement;
      const headerRect = header.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const summaryRect = summary.getBoundingClientRect();
      return {
        modalOverflow: window.getComputedStyle(element).overflow,
        bodyOverflowY: window.getComputedStyle(body).overflowY,
        bodyClientHeight: body.clientHeight,
        bodyScrollHeight: body.scrollHeight,
        bodyScrollTop: body.scrollTop,
        summaryHeight: summaryRect.height,
        headerBottom: headerRect.bottom,
        bodyTop: bodyRect.top,
        bodyBottom: bodyRect.bottom,
        footerTop: footerRect.top,
      };
    });
    expect(modalLayout.modalOverflow).toBe("hidden");
    expect(modalLayout.bodyOverflowY).toBe("auto");
    expect(modalLayout.bodyScrollHeight).toBeGreaterThan(modalLayout.bodyClientHeight);
    expect(modalLayout.bodyScrollTop).toBe(0);
    expect(modalLayout.summaryHeight).toBeGreaterThan(80);
    expect(modalLayout.headerBottom).toBeLessThanOrEqual(modalLayout.bodyTop + 1);
    expect(modalLayout.bodyBottom).toBeLessThanOrEqual(modalLayout.footerTop + 1);
    await page.screenshot({ path: testInfo.outputPath("admin-account-quotas.png"), fullPage: true });
  } finally {
    if (restorePlan) {
      const restoreResult = await page.evaluate(async ({ url, body }) => {
        const csrf = await fetch("/api/auth/csrf", { credentials: "include" }).then((response) => response.json()) as {
          headerName: string;
          token: string;
        };
        const response = await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            [csrf.headerName]: csrf.token,
          },
          body: JSON.stringify(body),
        });
        return { ok: response.ok, status: response.status };
      }, restorePlan);
      expect(restoreResult, "测试结束时恢复 student@sufe.demo 原始额度").toEqual({ ok: true, status: 200 });
      await page.reload();
      await expect(page.locator(".admin-console-layout")).toBeVisible();
      await openStudentAccount();
      await expect(dialog.getByLabel("AI 对话调用额度")).toHaveValue(restorePlan.original.ai);
      await expect(dialog.getByLabel("乐享 PPT 生成额度")).toHaveValue(restorePlan.original.ppt);
      await expect(dialog.getByLabel("WorkBuddy 视频额度")).toHaveValue(restorePlan.original.video);
    }
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(failures.httpFailures).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
});
