import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

export class SetNameCommand extends PatchCommand {
  constructor(
    private readonly store: BlockStore,
    private readonly blockId: number,
    private readonly name: string,
  ) {
    super();
  }

  do(): Patch[] {
    const before = this.store.snapshot(this.blockId);
    this.store.setName(this.blockId, this.name);
    return [{ id: this.blockId, before, after: this.store.snapshot(this.blockId) }];
  }
}
