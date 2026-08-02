import { test, expect, type Page } from "@playwright/test";

test.describe("Proscenium social chamber", () => {
  const dismissBlockingOverlays = async (page: Page) => {
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
        await gateway
          .locator("div.absolute.inset-0")
          .first()
          .click({ force: true })
          .catch(() => {});
      }
      await expect(gateway).toHaveCount(0, { timeout: 5000 }).catch(() => {});
    }
  };

  const waitForStableUI = async (page: Page) => {
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator("div.fixed.inset-0.z-\\[20000\\].cursor-wait"),
    ).toHaveCount(0, { timeout: 15000 });
    await dismissBlockingOverlays(page);
  };

  const seedQuietSession = async (page: Page) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("mimi_core_loop_onboarded", "1");
      } catch {
        // ignore
      }
    });
  };

  test("loads Stage wing with hero and wing nav", async ({ page }) => {
    await seedQuietSession(page);
    await page.goto("/proscenium");
    await waitForStableUI(page);

    await expect(page.getByTestId("proscenium-hero")).toBeVisible();
    await expect(page.getByTestId("proscenium-wings")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /The Proscenium/i }),
    ).toBeVisible();
    await expect(page.getByTestId("proscenium-wing-stage")).toBeVisible();
    await expect(
      page.getByTestId("proscenium-wing-correspondents"),
    ).toBeVisible();
    await expect(page.getByTestId("proscenium-wing-cliques")).toBeVisible();
  });

  test("switches wings and updates the URL", async ({ page }) => {
    await seedQuietSession(page);
    await page.goto("/proscenium");
    await waitForStableUI(page);

    await page.getByTestId("proscenium-wing-correspondents").click();
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/proscenium\/correspondents$/);
    await expect(
      page.getByRole("heading", { name: /Correspondents/i }),
    ).toBeVisible();

    await page.getByTestId("proscenium-wing-cliques").click();
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/proscenium\/cliques$/);
    await expect(page.getByRole("heading", { name: /Cliques/i })).toBeVisible();

    await page.getByTestId("proscenium-wing-stage").click();
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/proscenium$/);
  });

  test("legacy /connections and /cliques redirect into Proscenium wings", async ({
    page,
  }) => {
    await seedQuietSession(page);
    await page.goto("/connections");
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/proscenium\/correspondents$/);
    await expect(page.getByTestId("proscenium-wings")).toBeVisible();

    await page.goto("/cliques");
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/proscenium\/cliques$/);
    await expect(page.getByRole("heading", { name: /Cliques/i })).toBeVisible();
  });

  test("mimi:change_view opens correspondents wing", async ({ page }) => {
    await seedQuietSession(page);
    await page.goto("/studio");
    await waitForStableUI(page);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("mimi:change_view", {
          detail: "proscenium/correspondents",
        }),
      );
    });
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/proscenium\/correspondents$/);
    await expect(
      page.getByTestId("proscenium-wing-correspondents"),
    ).toBeVisible();
  });
});
