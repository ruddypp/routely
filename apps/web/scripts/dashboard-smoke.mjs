import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.ROUTELY_DASHBOARD_URL || "http://127.0.0.1:3030";
const outputDir = process.env.ROUTELY_DASHBOARD_SMOKE_DIR || "output/playwright";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 }
];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const apiRequests = [];
    const daemonRequests = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/")) apiRequests.push(url);
      if (/127\.0\.0\.1:9977|localhost:9977/.test(url)) daemonRequests.push(url);
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("daemon") && document.body.innerText.includes("connected"), null, { timeout: 10000 });
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.endsWith("/api/health")), null, { timeout: 10000 });
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.endsWith("/api/apps")), null, { timeout: 10000 });

    const body = await page.locator("body").innerText();
    if (!body.includes("connected")) throw new Error("Dashboard did not render daemon connected state.");
    if (daemonRequests.length > 0) throw new Error(`Browser requested daemon directly: ${daemonRequests.join(", ")}`);
    if (!apiRequests.some((url) => url.startsWith(baseUrl) && url.includes("/api/health"))) throw new Error("/api/health was not requested through same-origin dashboard API.");
    if (!apiRequests.some((url) => url.startsWith(baseUrl) && url.includes("/api/apps"))) throw new Error("/api/apps was not requested through same-origin dashboard API.");

    await page.getByRole("button", { name: /Apps/i }).first().click();
    await page.waitForFunction(() => document.body.innerText.includes("Add resource"), null, { timeout: 5000 });
    const appsBody = await page.locator("body").innerText();
    if (!appsBody.includes("hello-node-command") && !appsBody.includes("hello-dockerfile-app")) throw new Error("Dashboard did not render registered app rows in the Apps module.");
    const overflow = await page.evaluate(() => {
      const documentWidth = Math.ceil(document.documentElement.scrollWidth);
      const bodyWidth = Math.ceil(document.body.scrollWidth);
      const viewportWidth = Math.ceil(window.innerWidth);
      return {
        bodyWidth,
        documentWidth,
        viewportWidth
      };
    });
    if (overflow.documentWidth > overflow.viewportWidth || overflow.bodyWidth > overflow.viewportWidth) {
      throw new Error(`Dashboard overflow at ${viewport.width}x${viewport.height}: document=${overflow.documentWidth}, body=${overflow.bodyWidth}, viewport=${overflow.viewportWidth}`);
    }
    await page.screenshot({ path: `${outputDir}/dashboard-smoke-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Dashboard smoke passed for ${baseUrl}. Screenshots: ${outputDir}`);
