import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";

describe("BlockSelectionAPI — group context stack", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  it("starts at top level (empty stack)", () => {
    expect(engine.block.getGroupContext()).toEqual([]);
  });

  it("enter/exit maintain a correct stack across nested groups (outermost-first)", () => {
    engine.block.enterGroup(1);
    engine.block.enterGroup(2);
    engine.block.enterGroup(3);
    expect(engine.block.getGroupContext()).toEqual([1, 2, 3]);

    engine.block.exitGroup();
    expect(engine.block.getGroupContext()).toEqual([1, 2]);

    engine.block.exitGroup();
    engine.block.exitGroup();
    expect(engine.block.getGroupContext()).toEqual([]);
  });

  it("exitGroup is a no-op at the top level", () => {
    engine.block.exitGroup();
    expect(engine.block.getGroupContext()).toEqual([]);
  });

  it("getGroupContext returns a copy (caller cannot mutate internal state)", () => {
    engine.block.enterGroup(5);
    const stack = engine.block.getGroupContext();
    stack.push(999);
    expect(engine.block.getGroupContext()).toEqual([5]);
  });

  it("onGroupContextChanged fires on enter / exit / clear only, NOT on selection", () => {
    const cb = vi.fn();
    engine.block.onGroupContextChanged(cb);

    const page = engine.block.create("page");
    const a = engine.block.create("graphic");
    engine.block.appendChild(page, a);

    // Plain selection must NOT fire the context listener.
    engine.block.select(a);
    engine.block.deselectAll();
    expect(cb).not.toHaveBeenCalled();

    engine.block.enterGroup(7);
    expect(cb).toHaveBeenLastCalledWith([7]);

    engine.block.exitGroup();
    expect(cb).toHaveBeenLastCalledWith([]);

    engine.block.enterGroup(8);
    engine.block._clearGroupContext();
    expect(cb).toHaveBeenLastCalledWith([]);
    expect(cb).toHaveBeenCalledTimes(4);
  });

  it("entering the same group twice is idempotent (no duplicate push)", () => {
    engine.block.enterGroup(3);
    engine.block.enterGroup(3);
    expect(engine.block.getGroupContext()).toEqual([3]);
  });

  it("_clearGroupContext is a no-op when already at top level", () => {
    const cb = vi.fn();
    engine.block.onGroupContextChanged(cb);
    engine.block._clearGroupContext();
    expect(cb).not.toHaveBeenCalled();
  });

  it("onGroupContextChanged unsubscribe stops further notifications", () => {
    const cb = vi.fn();
    const unsubscribe = engine.block.onGroupContextChanged(cb);

    engine.block.enterGroup(1);
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();

    engine.block.enterGroup(2);
    engine.block.exitGroup();
    engine.block._clearGroupContext();
    // No further calls after unsubscribe.
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("multiple subscribers each receive events; unsubscribing one leaves others intact", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = engine.block.onGroupContextChanged(a);
    engine.block.onGroupContextChanged(b);

    engine.block.enterGroup(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    engine.block.exitGroup();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenLastCalledWith([]);
  });
});
