import { describe, expect, it } from "vitest";
import { normalizeShapePresetGeometry } from "../shape-geometry-options";
import { ABSTRACT_SHAPE_GEOMETRIES, SHARED_SHAPE_GEOMETRIES } from "./shape-geometries";

describe("shared shape geometries", () => {
  it("provides at least ten unique, valid closed geometries", () => {
    expect(SHARED_SHAPE_GEOMETRIES).toHaveLength(12);
    expect(new Set(SHARED_SHAPE_GEOMETRIES.map(({ id }) => id)).size).toBe(12);

    for (const geometry of SHARED_SHAPE_GEOMETRIES) {
      expect(() => normalizeShapePresetGeometry(geometry.shape, geometry.id)).not.toThrow();
      expect(geometry.shape.kind).not.toBe("line");
    }
  });

  it("provides twelve unique, valid abstract paths", () => {
    expect(ABSTRACT_SHAPE_GEOMETRIES).toHaveLength(12);
    expect(new Set(ABSTRACT_SHAPE_GEOMETRIES.map(({ id }) => id)).size).toBe(12);

    for (const geometry of ABSTRACT_SHAPE_GEOMETRIES) {
      expect(geometry.shape.kind).toBe("path");
      expect(() => normalizeShapePresetGeometry(geometry.shape, geometry.id)).not.toThrow();
    }
  });
});
