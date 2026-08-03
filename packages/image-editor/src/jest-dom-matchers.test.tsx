import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// Smoke test proving @testing-library/jest-dom matchers are wired via
// vitest.setup.ts (setupFiles). If the setup import were missing, the
// custom matchers below would be `undefined` and this test would fail.

afterEach(cleanup);

describe("jest-dom matchers", () => {
  it("exposes DOM matchers like toHaveAttribute / toBeInTheDocument", () => {
    render(
      <button type="button" aria-label="save" data-testid="probe">
        Save
      </button>,
    );

    const probe = screen.getByTestId("probe");

    expect(probe).toBeInTheDocument();
    expect(probe).toHaveAttribute("aria-label", "save");
    expect(probe).toHaveAttribute("type", "button");
  });
});
