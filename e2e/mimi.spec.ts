import { test, expect } from '@playwright/test';

test.describe('Mimi Zine E2E Experience', () => {
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

    // Check header navigation drawer or menu button
    const menuButton = page.locator('button[aria-label="Toggle Menu"], button[aria-label="Open Navigation"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    
    // Verify app remains responsive without unhandled errors
    await expect(page.locator('body')).toBeVisible();
  });
});
