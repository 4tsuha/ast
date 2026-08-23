import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  webServer: { command: "npm run preview -- --port 5173 --strictPort", url: "http://localhost:5173/", reuseExistingServer: !process.env.CI, timeout: 120000, cwd: "/root/new-project/frontend/ActivityPub.React" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
