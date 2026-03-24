import fs from "node:fs";
import path from "node:path";
import { test as base } from "@playwright/experimental-ct-react";

/**
 * Extended test fixture that serves test images from the fixtures directory
 * via route interception. The test images are available at `/fixtures/*`.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const fixturesDir = path.resolve(__dirname, "fixtures");
    await page.route("/fixtures/**", (route) => {
      const url = new URL(route.request().url());
      const filePath = path.join(fixturesDir, url.pathname.replace("/fixtures/", ""));
      if (fs.existsSync(filePath)) {
        route.fulfill({
          path: filePath,
          contentType: "image/png",
        });
      } else {
        route.fulfill({ status: 404, body: "Not found" });
      }
    });
    await use(page);
  },
});

export { expect } from "@playwright/experimental-ct-react";
