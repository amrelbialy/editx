import { describe, expect, it } from "vitest";
import * as engine from "./index";

/**
 * Public API contract for @editx/engine.
 *
 * This snapshot locks the set of runtime exports so that accidental
 * removals or renames break CI. Intentional changes update the snapshot
 * (`vitest -u`) and are reviewed as a deliberate API change.
 */
describe("@editx/engine public API", () => {
  it("exports a stable set of runtime members", () => {
    const publicExports = Object.keys(engine).sort();
    expect(publicExports).toMatchSnapshot();
  });

  it("exposes the core entry points", () => {
    // A few load-bearing names asserted explicitly as a human-readable contract.
    expect(engine).toHaveProperty("EditxEngine");
    expect(engine).toHaveProperty("BlockAPI");
    expect(engine).toHaveProperty("EventAPI");
    expect(engine).toHaveProperty("BlockStore");
  });
});
