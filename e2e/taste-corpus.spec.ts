import { test, expect } from "@playwright/test";

test.describe("Taste Corpus embedding explorer", () => {
  test("serves crawlable specimen links in server HTML", async ({ request }) => {
    const res = await request.get("/taste-corpus");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();

    expect(html).toContain('data-taste-corpus-crawl="index"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain("Industrial raw concrete");
    expect(html).toContain('href="/showcase"');
    expect(html).toMatch(/<title>Taste Corpus — Mimi<\/title>/i);

    const rootIdx = html.indexOf('<div id="root">');
    const crawlIdx = html.indexOf('data-taste-corpus-crawl="index"');
    expect(crawlIdx).toBeGreaterThan(-1);
    expect(rootIdx).toBeGreaterThan(-1);
    expect(crawlIdx).toBeLessThan(rootIdx);
  });

  test("loads static embedding artifacts", async ({ request }) => {
    const [embeddingsRes, indexRes] = await Promise.all([
      request.get("/data/embeddings.json"),
      request.get("/data/taste-corpus-index.json"),
    ]);

    expect(embeddingsRes.ok()).toBeTruthy();
    expect(indexRes.ok()).toBeTruthy();

    const embeddings = await embeddingsRes.json();
    const index = await indexRes.json();

    expect(embeddings.meta.coordSpace).toBe("[-1,1]");
    expect(embeddings.meta.umap.min_dist).toBe(0.1);
    expect(embeddings.points.length).toBeGreaterThan(0);
    expect(index.items.length).toBe(embeddings.points.length);

    for (const point of embeddings.points) {
      expect(point).not.toHaveProperty("title");
      expect(point).not.toHaveProperty("href");
      expect(point.x).toBeGreaterThanOrEqual(-1);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(-1);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  test("renders the map with SVG projection and crawl list", async ({ page }) => {
    await page.goto("/taste-corpus");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Taste Corpus" })).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.getByRole("application", {
        name: /Taste corpus embedding map/i,
      }),
    ).toBeVisible();

    await expect(page.getByText(/specimens · svg projection/i)).toBeVisible();

    const crawlList = page.locator('[data-taste-corpus-crawl="client"]');
    await expect(crawlList).toBeAttached();
    await expect(crawlList.locator("a").first()).toHaveAttribute("href", "/showcase");

    const map = page.getByRole("application", {
      name: /Taste corpus embedding map/i,
    });
    const mapSvg = map.locator("svg.touch-none");
    await expect(mapSvg).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("shows hover preview on specimen points", async ({ page }) => {
    await page.goto("/taste-corpus");
    await page.waitForLoadState("domcontentloaded");

    const map = page.getByRole("application", {
      name: /Taste corpus embedding map/i,
    });
    await expect(map).toBeVisible({ timeout: 20000 });

    const point = map.locator("svg.touch-none circle").first();
    await expect(point).toBeVisible();
    const box = await point.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page.getByRole("tooltip")).toContainText(/open specimen/i);
  });
});
