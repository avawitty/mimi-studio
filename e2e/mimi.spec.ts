import { test, expect, type Page } from '@playwright/test';

test.describe('Mimi Zine E2E Experience', () => {
  const waitForStableUI = async (page: Page) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('div.fixed.inset-0.z-\\[20000\\].cursor-wait')).toHaveCount(0, { timeout: 15000 });
  };

  test('should load the home page and verify core branding', async ({ page }) => {
    await page.goto('/');
    
    // Verify title or main branding element exists
    await expect(page).toHaveTitle(/Mimi/i);
    
    // Check header/logo text "Mimi" is visible
    const logo = page.locator('header').getByText('Mimi', { exact: false });
    await expect(logo.first()).toBeVisible();
  });

  test('should verify health and heartbeat API endpoints', async ({ request }) => {
    const healthRes = await request.get('/api/health');
    expect(healthRes.ok()).toBeTruthy();
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ok');

    const heartbeatRes = await request.get('/api/heartbeat');
    expect(heartbeatRes.ok()).toBeTruthy();
    const heartbeatJson = await heartbeatRes.json();
    expect(heartbeatJson.status).toBe('ok');
    expect(heartbeatJson.metrics).toBeDefined();

    // Verify proxy gemini validation endpoint responds
    const proxyRes = await request.post('/api/proxy/gemini', {
      data: {
        action: 'generateContent',
        params: {
          model: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: 'Respond with valid' }] }]
        }
      }
    });
    expect([200, 400, 403]).toContain(proxyRes.status());
  });

  test('should navigate between view modes gracefully', async ({ page }) => {
    await page.goto('/');
    await waitForStableUI(page);

    const navigateToMode = async (mode: string) => {
      await page.evaluate((nextMode) => {
        window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: nextMode }));
      }, mode);
      await waitForStableUI(page);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByText('Registry Void.', { exact: false })).toHaveCount(0);
    };

    await navigateToMode('studio');
    await navigateToMode('tailor');
    await navigateToMode('darkroom');
    await navigateToMode('threads');
  });

  test('should capture visual baselines for top-level chambers', async ({ page }) => {
    await page.goto('/');
    await waitForStableUI(page);

    await expect(page).toHaveScreenshot('worktable-shell.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'tailor' }));
    });
    await waitForStableUI(page);
    await expect(page).toHaveScreenshot('tailor-shell.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'darkroom' }));
    });
    await waitForStableUI(page);
    await expect(page).toHaveScreenshot('darkroom-shell.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });
});
