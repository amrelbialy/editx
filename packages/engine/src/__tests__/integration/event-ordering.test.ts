import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppendEffectCommand } from "../../controller/commands/append-effect-command";
import { CreateBlockCommand } from "../../controller/commands/create-block-command";
import { CreateEffectCommand } from "../../controller/commands/create-effect-command";
import { DestroyBlockCommand } from "../../controller/commands/destroy-block-command";
import { RemoveEffectCommand } from "../../controller/commands/remove-effect-command";
import { SetPropertyCommand } from "../../controller/commands/set-property-command";
import { EditxEngine } from "../../editx-engine";
import type { BlockEvent } from "../../event-api";
import { createMockRenderer } from "../mocks/mock-renderer";

describe("Engine Integration: Event Ordering", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  it("delivers 'created' event after command exec", () => {
    const events: BlockEvent[] = [];
    engine.event.subscribe([], (evts) => events.push(...evts));

    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("created");
    expect(events[0].block).toBe(cmd.getCreatedId());
  });

  it("delivers 'updated' event on property change", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    const events: BlockEvent[] = [];
    engine.event.subscribe([id], (evts) => events.push(...evts));

    engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 50));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("updated");
  });

  it("delivers 'destroyed' event on block destruction", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    const events: BlockEvent[] = [];
    engine.event.subscribe([id], (evts) => events.push(...evts));

    engine.exec(new DestroyBlockCommand(store, id));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("destroyed");
  });

  it("delivers events only after batch ends", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    const events: BlockEvent[] = [];
    engine.event.subscribe([], (evts) => events.push(...evts));

    engine.beginBatch();
    engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
    engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));

    // No events yet during batch
    expect(events).toHaveLength(0);

    engine.endBatch();

    // Events delivered after batch ends
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe("updated");
  });

  it("dedupes events within a batch (same block → single event)", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    const events: BlockEvent[] = [];
    engine.event.subscribe([id], (evts) => events.push(...evts));

    engine.beginBatch();
    engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
    engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
    engine.exec(new SetPropertyCommand(store, id, "transform/rotation", 45));
    engine.endBatch();

    // Should be deduplicated to a single 'updated' event for the block
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("updated");
    expect(events[0].block).toBe(id);
  });

  it("filtered subscription receives only matching block events", () => {
    const store = engine.getBlockStore();

    const cmd1 = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd1);
    const id1 = cmd1.getCreatedId()!;

    const cmd2 = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd2);
    const id2 = cmd2.getCreatedId()!;

    const events1: BlockEvent[] = [];
    engine.event.subscribe([id1], (evts) => events1.push(...evts));

    const events2: BlockEvent[] = [];
    engine.event.subscribe([id2], (evts) => events2.push(...evts));

    engine.exec(new SetPropertyCommand(store, id1, "transform/position/x", 50));

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(0);
  });

  it("unsubscribe stops event delivery", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    const events: BlockEvent[] = [];
    const unsub = engine.event.subscribe([id], (evts) => events.push(...evts));

    engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
    expect(events).toHaveLength(1);

    unsub();

    engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 20));
    expect(events).toHaveLength(1); // Still 1, no new events
  });
});

describe("Engine Integration: Effect Chains", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  it("creates effect, appends to block, sets properties, and undoes all", () => {
    const store = engine.getBlockStore();

    // Create a graphic block
    const blockCmd = new CreateBlockCommand(store, "graphic");
    engine.exec(blockCmd);
    const blockId = blockCmd.getCreatedId()!;

    // Create an adjustments effect
    const effectCmd = new CreateEffectCommand(store, "adjustments");
    engine.exec(effectCmd);
    const effectId = effectCmd.getCreatedId()!;
    expect(store.exists(effectId)).toBe(true);

    // Append effect to block
    engine.exec(new AppendEffectCommand(store, blockId, effectId));
    expect(store.get(blockId)!.effectIds).toContain(effectId);

    // Set a property on the effect
    engine.exec(new SetPropertyCommand(store, effectId, "adjustments/brightness", 0.5));
    expect(store.getFloat(effectId, "adjustments/brightness")).toBe(0.5);

    // Undo property → brightness back to 0
    engine.undo();
    expect(store.getFloat(effectId, "adjustments/brightness")).toBe(0);

    // Undo append → effect detached
    engine.undo();
    expect(store.get(blockId)!.effectIds).not.toContain(effectId);

    // Redo append → effect reattached
    engine.redo();
    expect(store.get(blockId)!.effectIds).toContain(effectId);
  });

  it("remove effect and undo restores it", () => {
    const store = engine.getBlockStore();

    const blockCmd = new CreateBlockCommand(store, "graphic");
    engine.exec(blockCmd);
    const blockId = blockCmd.getCreatedId()!;

    const effectCmd = new CreateEffectCommand(store, "adjustments");
    engine.exec(effectCmd);
    const effectId = effectCmd.getCreatedId()!;

    engine.exec(new AppendEffectCommand(store, blockId, effectId));
    expect(store.get(blockId)!.effectIds).toEqual([effectId]);

    // Remove effect at index 0
    engine.exec(new RemoveEffectCommand(store, blockId, 0));
    expect(store.get(blockId)!.effectIds).toEqual([]);

    // Undo → effect restored
    engine.undo();
    expect(store.get(blockId)!.effectIds).toEqual([effectId]);
  });
});

describe("Engine Integration: Renderer Sync", () => {
  let engine: EditxEngine;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
  });

  it("syncs blocks to renderer after each command", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);

    expect(renderer.syncBlock).toHaveBeenCalled();
    expect(renderer.renderFrame).toHaveBeenCalled();
  });

  it("removes blocks from renderer on destroy", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    vi.mocked(renderer.removeBlock).mockClear();
    engine.exec(new DestroyBlockCommand(store, id));

    expect(renderer.removeBlock).toHaveBeenCalledWith(id);
  });

  it("syncs + renders after undo/redo", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);

    vi.mocked(renderer.syncBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();

    engine.undo();
    expect(renderer.renderFrame).toHaveBeenCalled();

    vi.mocked(renderer.renderFrame).mockClear();
    engine.redo();
    expect(renderer.renderFrame).toHaveBeenCalled();
  });

  it("batched commands result in a single render frame", () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, "graphic");
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;

    vi.mocked(renderer.renderFrame).mockClear();

    engine.beginBatch();
    engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
    engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));

    // No render during batch
    expect(renderer.renderFrame).not.toHaveBeenCalled();

    engine.endBatch();

    // Single render after batch
    expect(renderer.renderFrame).toHaveBeenCalledTimes(1);
  });
});
