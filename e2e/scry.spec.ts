import { test, expect, type Page } from "@playwright/test";

async function dismissBlockingOverlays(page: Page) {
  const onboarding = page.getByRole("button", { name: "Dismiss onboarding" });
  if (await onboarding.count()) {
    await onboarding.first().click({ force: true }).catch(() => {});
    await expect(onboarding).toHaveCount(0, { timeout: 5000 }).catch(() => {});
  }

  const gateway = page.locator("div.fixed.inset-0.z-\\[200\\]");
  if (await gateway.count()) {
    const close = gateway.locator("button").first();
    if (await close.count()) {
      await close.click({ force: true }).catch(() => {});
    } else {
      await gateway.locator("div.absolute.inset-0").first().click({ force: true }).catch(() => {});
    }
    await expect(gateway).toHaveCount(0, { timeout: 5000 }).catch(() => {});
  }
}

async function waitForStableUI(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("div.fixed.inset-0.z-\\[20000\\].cursor-wait")).toHaveCount(0, {
    timeout: 15000,
  });
  await dismissBlockingOverlays(page);
}

async function seedQuietSession(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mimi_core_loop_onboarded", "1");
    } catch {
      // ignore
    }
  });
}

async function openScry(page: Page) {
  await seedQuietSession(page);
  await page.goto("/");
  await waitForStableUI(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "scry" }));
  });
  await waitForStableUI(page);
  await expect(page.getByTestId("scry-chamber")).toBeVisible({ timeout: 20000 });
}

test.describe("Scry chamber", () => {
  test("loads chamber shell with mobile mode tabs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openScry(page);

    await expect(page.getByRole("navigation", { name: "Scry modes" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Specimen" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Trend" }).first()).toBeVisible();
    await expect(page.locator('[data-testid="scry-query"]:visible')).toBeVisible();
    // One Scry title only — chamber masthead (no duplicate hero wordmark)
    await expect(page.getByRole("heading", { name: "Scry", exact: true })).toHaveCount(1);
    await expect(page.getByText("Ask a mood or a ghost")).toBeVisible();

    // No cream-paper texture / broadsheet leftover
    await expect(page.locator("img[src*='cream-paper']")).toHaveCount(0);
  });

  test("switches to Trend tab on mobile and shows Deep-Scry controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openScry(page);

    await page.getByRole("button", { name: "Trend" }).first().click();
    await expect(page.getByTestId("trend-query")).toBeVisible();
    await expect(page.getByRole("button", { name: "Deep-Scry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Saturation Chic" })).toBeVisible();
    await expect(page.getByText("Live search into a biaxial field")).toBeVisible();
  });

  test("desktop shows specimen query and lane strip idle state", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openScry(page);

    await expect(page.locator('[data-testid="scry-query"]:visible')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ask the registry" })).toBeVisible();
    await expect(page.locator("[data-lane='personalMemory']:visible").first()).toBeVisible();
    await expect(page.locator("[data-lane='web']:visible").first()).toBeVisible();
    await expect(page.locator("[data-lane='generatedReading']:visible").first()).toBeVisible();
    await expect(page.locator("[data-lane='shadowMemory']:visible").first()).toBeVisible();
  });
});
