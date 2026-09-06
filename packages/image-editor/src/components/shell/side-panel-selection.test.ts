import { describe, expect, it } from "vitest";
import { isValidPropertySelection } from "./side-panel-selection";

describe("isValidPropertySelection", () => {
  it.each([
    "text",
    "graphic",
    "image",
    "group",
  ])("keeps the property panel open for a selected %s block", (blockType) => {
    expect(isValidPropertySelection(blockType)).toBe(true);
  });

  it("rejects missing and unsupported selections", () => {
    expect(isValidPropertySelection(null)).toBe(false);
    expect(isValidPropertySelection("page")).toBe(false);
  });
});
