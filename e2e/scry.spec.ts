import { test, expect, type Page } from "@playwright/test";

async function waitForStableUI(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("div.fixed.inset-0.z-\\[20000\\].cursor-wait")).toHaveCount(0, {
    timeout: 15000,
  });
}

async function openScry(page: Page) {
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
    await expect(page.getByTestId("scry-query")).toBeVisible();

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
  });

  test("desktop shows specimen query and lane strip idle state", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openScry(page);

    await expect(page.getByTestId("scry-query")).toBeVisible();
    await expect(page.locator("[data-lane='personalMemory']").first()).toBeVisible();
    await expect(page.locator("[data-lane='web']").first()).toBeVisible();
    await expect(page.locator("[data-lane='generatedReading']").first()).toBeVisible();
    await expect(page.locator("[data-lane='shadowMemory']").first()).toBeVisible();
  });
});
