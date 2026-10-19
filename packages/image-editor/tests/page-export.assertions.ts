import { expect, type Page, type Route } from "@playwright/experimental-ct-react";
import type { Pixel } from "./page-export.types";

export interface ControlledAsset {
  requested: Promise<void>;
  release(): void;
}

export function expectPixel(
  actual: Pixel | undefined,
  expected: Pixel,
  tolerance = 2,
): void {
  expect(actual).toBeDefined();
  for (let index = 0; index < 4; index += 1) {
    expect(Math.abs((actual?.[index] ?? -1000) - expected[index])).toBeLessThanOrEqual(tolerance);
  }
}

export async function routeSvg(
  page: Page,
  path: string,
  color: string,
): Promise<void> {
  await page.route(`**${path}`, (route) => fulfillSvg(route, color));
}

export async function routeBroken(page: Page, path: string): Promise<void> {
  await page.route(`**${path}`, (route) =>
    route.fulfill({ status: 404, contentType: "text/plain", body: "missing" }),
  );
}

export async function routeControlledSvg(
  page: Page,
  path: string,
  color: string,
): Promise<ControlledAsset> {
  let markRequested: (() => void) | undefined;
  let releaseRequest: (() => void) | undefined;
  const requested = new Promise<void>((resolve) => {
    markRequested = resolve;
  });
  const released = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route(`**${path}`, async (route) => {
    markRequested?.();
    await released;
    await fulfillSvg(route, color);
  });
  return { requested, release: () => releaseRequest?.() };
}

async function fulfillSvg(route: Route, color: string): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body:
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12">` +
      `<rect width="16" height="12" fill="${color}"/></svg>`,
  });
}
