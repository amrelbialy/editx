import PatchCommand from './patch-command';
import type { Layer } from '../../document/document.types';
import type { CreativeDocument } from '../../document/creative-document';

export class UpdateLayerCommand extends PatchCommand {
  private previous: Layer | null = null;

  constructor(
    private document: CreativeDocument,
    private id: string,
    private updates: Partial<Layer>
  ) {
    super();
  }

  do(): void {
    const layer = this.document.layers.find((l) => l.id === this.id);
    console.log('do', layer);
    console.log('updates', this.updates);
    if (layer) {
      this.previous = { ...layer };
      this.document.updateLayer(this.id, this.updates);
    }
  }

  undo(): void {
    if (this.previous) {
      this.document.updateLayer(this.id, this.previous);
    }
  }
}
