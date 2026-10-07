import { defineConfig, devices } from '@playwright/test'

// Chromium records a generated tone instead of a real microphone, and grants access unasked,
// so the placement test's speaking part can run unattended.
const fakeMicrophone = {
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
}

// Mobile viewports first; desktop only as a sanity check.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // Requests handled by a service worker bypass page.route(), which would make mocks flaky.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'pixel-7', use: { ...devices['Pixel 7'], ...fakeMicrophone } },
    // WebKit has no fake microphone, so tests that record are skipped in this project.
    { name: 'iphone-14', use: { ...devices['iPhone 14'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...fakeMicrophone } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
