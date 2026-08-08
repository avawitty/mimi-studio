import { test, expect, type Page } from '@playwright/test';

test.describe('Mimi E2E Experience', () => {
  const dismissBlockingOverlays = async (page: Page) => {
    const onboarding = page.getByRole('button', { name: 'Dismiss onboarding' });
    if (await onboarding.count()) {
      await onboarding.first().click({ force: true }).catch(() => {});
      await expect(onboarding).toHaveCount(0, { timeout: 5000 }).catch(() => {});
    }

    const essential = page.getByRole('button', { name: /essential only/i });
    if (await essential.count()) {
      await essential.first().click({ force: true }).catch(() => {});
      await expect(essential).toHaveCount(0, { timeout: 5000 }).catch(() => {});
    }

    const gateway = page.locator('div.fixed.inset-0.z-\\[200\\]');
    if (await gateway.count()) {
      const close = gateway.locator('button').first();
      if (await close.count()) {
        await close.click({ force: true }).catch(() => {});
      } else {
        await gateway
          .locator('div.absolute.inset-0')
          .first()
          .click({ force: true })
          .catch(() => {});
      }
      await expect(gateway).toHaveCount(0, { timeout: 5000 }).catch(() => {});
    }
  };

  const waitForStableUI = async (page: Page) => {
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div.fixed.inset-0.z-\\[20000\\].cursor-wait')).toHaveCount(0, { timeout: 15000 });
    await dismissBlockingOverlays(page);
  };

  const seedQuietSession = async (page: Page) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('mimi_core_loop_onboarded', '1');
        localStorage.setItem('mimi_cookie_consent', 'essential');
      } catch {
        // ignore
      }
    });
  };

  test('should load the home page and verify core branding', async ({ page }) => {
    await seedQuietSession(page);
    await page.goto('/');
    await waitForStableUI(page);

    // Verify title or main branding element exists
    await expect(page).toHaveTitle(/Mimi/i);

    // Check header/logo text "Mimi" is visible
    const logo = page.getByText('Mimi', { exact: true });
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
    await seedQuietSession(page);
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
    await seedQuietSession(page);
    await page.goto('/studio');
    await waitForStableUI(page);
    await expect(page.getByRole('region', { name: 'Cover image composer' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Compose cover')).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('studio-compose-console.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'tailor' }));
    });
    await waitForStableUI(page);
    await expect(
      page.getByRole('navigation', { name: /Tailor profile workflow/i }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveScreenshot('tailor-shell.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'darkroom' }));
    });
    await waitForStableUI(page);
    await expect(
      page.getByRole('heading', { name: /The Darkroom/i }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveScreenshot('darkroom-shell.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });
});

