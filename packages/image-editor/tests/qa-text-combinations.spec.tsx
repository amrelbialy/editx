import path from "node:path";
import type { Locator } from "@playwright/test";
import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-200x150.png";
const screenshotPath = (name: string) =>
  path.resolve(__dirname, `../../../test-results/qa-text-combinations-${name}.png`);

async function openCombinations(component: Locator) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });
  await component.getByRole("button", { name: "Text" }).click();
  const heading = component.getByText("Text Combinations", { exact: true });
  await expect(heading).toBeVisible();
  const row = heading.locator("..");
  await row.getByRole("button", { name: /More/ }).click();
  await expect(component.getByRole("button", { name: "Quote" })).toBeVisible();
}

test("desktop expanded combinations and inserted quote", async ({ mount }) => {
  const component = await mount(<ImageEditor src={TEST_IMAGE} width="1000px" height="720px" />);
  await openCombinations(component);
  await component.screenshot({ path: screenshotPath("desktop-expanded") });

  await component.getByRole("button", { name: "Quote" }).click();
  await component.page().waitForTimeout(500);
  await component.screenshot({ path: screenshotPath("desktop-quote-inserted") });
});

test("compact expanded combinations and inserted sale badge", async ({ mount }) => {
  const component = await mount(<ImageEditor src={TEST_IMAGE} width="400px" height="700px" />);
  await openCombinations(component);
  await component.screenshot({ path: screenshotPath("compact-expanded") });

  await component.getByRole("button", { name: "Sale Badge" }).click();
  await component.getByRole("button", { name: "Close panel" }).click();
  await component.page().waitForTimeout(500);
  await component.screenshot({ path: screenshotPath("compact-sale-badge-inserted") });
});