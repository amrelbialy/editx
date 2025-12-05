// Transformer.ts
export class Transformer {
  constructor(app, options = {}) {
    this.app = app;
    this.nodes = [];
    this.container = new TransformerContainer(options);
  }

  setNodes(nodes) {
    this.nodes = nodes;
    this._update();
  }

  _update() {
    const bbox = getBoundingBox(this.nodes);
    this.container.update(bbox);
  }

  onAnchorDrag(anchor, newBBox) {
    applyBoundingBoxToNodes(this.nodes, newBBox);
    this._update();
  }
}
