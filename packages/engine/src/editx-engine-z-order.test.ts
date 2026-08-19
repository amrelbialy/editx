import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("EditxEngine z-order rendering", () => {
  it("syncs every z-order action for children inside a group", () => {
    const renderer = createMockRenderer();
    renderer.syncChildOrder = vi.fn();
    const engine = new EditxEngine({ renderer });
    const page = engine.block.create("page");
    const group = engine.block.create("group");
    const first = engine.block.create("graphic");
    const second = engine.block.create("graphic");
    const third = engine.block.create("graphic");

    engine.block.appendChild(page, group);
    engine.block.appendChild(group, first);
    engine.block.appendChild(group, second);
    engine.block.appendChild(group, third);
    vi.mocked(renderer.syncChildOrder).mockClear();

    engine.block.bringForward(first);
    expect(engine.block.getChildren(group)).toEqual([second, first, third]);
    expect(renderer.syncChildOrder).toHaveBeenCalledOnce();
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith([second, first, third]);

    vi.mocked(renderer.syncChildOrder).mockClear();
    engine.block.sendBackward(first);
    expect(engine.block.getChildren(group)).toEqual([first, second, third]);
    expect(renderer.syncChildOrder).toHaveBeenCalledOnce();
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith([first, second, third]);

    vi.mocked(renderer.syncChildOrder).mockClear();
    engine.block.bringToFront(first);
    expect(engine.block.getChildren(group)).toEqual([second, third, first]);
    expect(renderer.syncChildOrder).toHaveBeenCalledOnce();
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith([second, third, first]);

    vi.mocked(renderer.syncChildOrder).mockClear();
    engine.block.sendToBack(first);
    expect(engine.block.getChildren(group)).toEqual([first, second, third]);
    expect(renderer.syncChildOrder).toHaveBeenCalledOnce();
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith([first, second, third]);
  });
});
