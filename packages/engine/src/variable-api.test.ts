import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditxEngine } from "./editx-engine";
import type { VariableAPI } from "./variable-api";

describe("VariableAPI", () => {
  let engine: EditxEngine;
  let api: VariableAPI;

  beforeEach(() => {
    engine = new EditxEngine({});
    api = engine.variable;
  });

  describe("setString / getString", () => {
    it("stores and retrieves a value", () => {
      api.setString("name", "World");
      expect(api.getString("name")).toBe("World");
    });

    it("returns undefined for unset variable", () => {
      expect(api.getString("missing")).toBeUndefined();
    });

    it("overwrites existing value", () => {
      api.setString("name", "Alice");
      api.setString("name", "Bob");
      expect(api.getString("name")).toBe("Bob");
    });
  });

  describe("findAll", () => {
    it("returns all set variable names", () => {
      api.setString("name", "World");
      api.setString("market", "US");
      api.setString("sku", "123");
      expect(api.findAll()).toEqual(["name", "market", "sku"]);
    });

    it("returns empty array when no variables set", () => {
      expect(api.findAll()).toEqual([]);
    });
  });

  describe("remove", () => {
    it("deletes the variable", () => {
      api.setString("name", "World");
      api.remove("name");
      expect(api.getString("name")).toBeUndefined();
      expect(api.findAll()).not.toContain("name");
    });

    it("is a no-op for non-existent variable", () => {
      expect(() => api.remove("nope")).not.toThrow();
    });
  });

  describe("resolve", () => {
    it("replaces {{key}} with stored value", () => {
      api.setString("name", "World");
      expect(api.resolve("Hello, {{name}}!")).toBe("Hello, World!");
    });

    it("leaves {{key}} as-is when variable not set", () => {
      expect(api.resolve("Hello, {{name}}!")).toBe("Hello, {{name}}!");
    });

    it("handles multiple placeholders in one string", () => {
      api.setString("market", "FR");
      api.setString("headline", "Summer Sale");
      api.setString("sku", "12345");
      expect(api.resolve("{{market}} — {{headline}} — SKU {{sku}}")).toBe(
        "FR — Summer Sale — SKU 12345",
      );
    });

    it("handles adjacent placeholders", () => {
      api.setString("a", "X");
      api.setString("b", "Y");
      expect(api.resolve("{{a}}{{b}}")).toBe("XY");
    });

    it("handles empty string input", () => {
      expect(api.resolve("")).toBe("");
    });

    it("handles text with no placeholders", () => {
      expect(api.resolve("plain text")).toBe("plain text");
    });

    it("resolves only set variables and leaves others literal", () => {
      api.setString("name", "World");
      expect(api.resolve("{{name}} and {{missing}}")).toBe("World and {{missing}}");
    });
  });

  describe("serialization", () => {
    it("_serialize returns all values as a plain object", () => {
      api.setString("name", "World");
      api.setString("market", "US");
      expect(api._serialize()).toEqual({ name: "World", market: "US" });
    });

    it("_serialize returns empty object when no variables", () => {
      expect(api._serialize()).toEqual({});
    });

    it("_deserialize restores values, clearing previous state", () => {
      api.setString("old", "value");
      api._deserialize({ name: "World", market: "US" });
      expect(api.getString("old")).toBeUndefined();
      expect(api.getString("name")).toBe("World");
      expect(api.getString("market")).toBe("US");
    });
  });

  describe("events", () => {
    it("setString emits variable:changed event", () => {
      const handler = vi.fn();
      engine.on("variable:changed", handler);
      api.setString("name", "World");
      expect(handler).toHaveBeenCalledWith("name", "World");
    });

    it("remove emits variable:changed event with undefined", () => {
      const handler = vi.fn();
      api.setString("name", "World");
      engine.on("variable:changed", handler);
      api.remove("name");
      expect(handler).toHaveBeenCalledWith("name", undefined);
    });
  });
});
