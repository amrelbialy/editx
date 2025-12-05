import PatchCommand from './patch-command';
import type { Layer } from '../../document/document.types';
import type { CreativeDocument } from '../../document/creative-document';

export class CreateLayerCommand extends PatchCommand {
  private id: string;
  private layer: Layer;

  constructor({ id, layer }: { id: string; layer: Layer }) {
    super();
    this.id = id;
    this.layer = layer;
  }

  do(doc: CreativeDocument) {
    // Read current state, calculate what should change
    const layer = { id: this.id, ...this.layer };
    return [
      {
        id: this.id,
        before: null, // or doc.layers.find(l => l.id === this.id)
        after: layer,
      },
    ];
    // NO direct mutation of doc here!
  }

  undo(doc: CreativeDocument) {
    return [
      {
        id: this.id,
        before: doc.layers.find((l) => l.id === this.id),
        after: null,
      },
    ];
  }
}
