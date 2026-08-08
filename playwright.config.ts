import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude the iOS PWA shell spec so it only runs under the ios-pwa project.
      testIgnore: '**/ios-pwa-shell.spec.ts',
    },
    {
      // Simulates an iPhone running Safari in installed-PWA (standalone) mode.
      // The iOS PWA shell tests in e2e/ios-pwa-shell.spec.ts target this project.
      name: 'ios-pwa',
      use: {
        // devices['iPhone 14'] uses the WebKit browser engine; Chromium launch
        // flags are not applicable here and would break WebKit launches.
        ...devices['iPhone 16 Pro Max'],
      },
      testMatch: '**/ios-pwa-shell.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
