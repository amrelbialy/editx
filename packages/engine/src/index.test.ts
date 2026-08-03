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
  });

  describe("mutable-store side door is sealed", () => {
    it("does not export the mutable BlockStore runtime class", () => {
      // Direct BlockStore access would bypass the command/undo pipeline.
      expect(engine).not.toHaveProperty("BlockStore");
    });

    it("does not export the EngineCore internal type/runtime", () => {
      expect(engine).not.toHaveProperty("EngineCore");
    });

    it("EditxEngine has no public getBlockStore method", () => {
      const instance = new engine.EditxEngine({});
      // The public API must not expose a mutable store accessor.
      expect("getBlockStore" in instance).toBe(false);
      expect((instance as Record<string, unknown>).getBlockStore).toBeUndefined();
    });

    it("EditxEngine still exposes the sanctioned internal accessor", () => {
      const instance = new engine.EditxEngine({});
      // Internal-only escape hatch (marked @internal) remains for engine wiring.
      expect(typeof (instance as unknown as { _getBlockStore: unknown })._getBlockStore).toBe(
        "function",
      );
    });
  });
});
