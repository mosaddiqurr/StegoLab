import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", globalSetup: "./fixtures.mjs", timeout: 60_000, expect: { timeout: 15_000 }, workers: 1,
  use: { baseURL: "http://127.0.0.1:5194", trace: "retain-on-failure", viewport: { width: 1440, height: 1000 } },
  projects: [
    { name: "chromium", testMatch: "static.spec.ts", use: { ...devices["Desktop Chrome"], viewport: {width:1440,height:1000} } },
    { name: "mobile", testMatch: "responsive.spec.ts", use: { ...devices["Pixel 7"] } },
  ],
});

