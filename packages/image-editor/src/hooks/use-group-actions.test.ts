import { EditxEngine } from "@editx/engine";
import { describe, expect, it } from "vitest";
import { ungroupSelection } from "./use-group-actions";

describe("ungroupSelection", () => {
  it("releases the children and leaves no selected blocks", () => {
    const engine = new EditxEngine();
    const pageId = engine.block.create("page");
    const firstId = engine.block.create("graphic");
    const secondId = engine.block.create("graphic");
    engine.block.appendChild(pageId, firstId);
    engine.block.appendChild(pageId, secondId);
    const groupId = engine.block.group([firstId, secondId]);
    engine.block.select(groupId);

    expect(ungroupSelection(engine)).toEqual([firstId, secondId]);

    expect(engine.block.findAllSelected()).toEqual([]);
    expect(engine.block.getChildren(pageId)).toEqual([firstId, secondId]);
  });
});
