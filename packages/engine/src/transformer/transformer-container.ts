// TransformerContainer.ts
import { Container, Graphics } from "pixi.js";
import { ResizeAnchor } from "./resize-anchor";
import { RotateAnchor } from "./rotate-anchor";

export class TransformerContainer extends Container {
  constructor(options) {
    super();
    this.border = new Graphics();
    this.addChild(this.border);

    this.anchors = {
      tl: new ResizeAnchor("tl"),
      tr: new ResizeAnchor("tr"),
      bl: new ResizeAnchor("bl"),
      br: new ResizeAnchor("br"),
      rot: new RotateAnchor()
    };

    Object.values(this.anchors).forEach(anchor => this.addChild(anchor));
  }

  update(bbox) {
    const { x, y, width, height } = bbox;

    // Draw border
    this.border.clear()
      .lineStyle(1, 0x00A8FF)
      .drawRect(x, y, width, height);

    // Position anchors
    this.anchors.tl.position.set(x, y);
    this.anchors.tr.position.set(x + width, y);
    this.anchors.bl.position.set(x, y + height);
    this.anchors.br.position.set(x + width, y + height);
    this.anchors.rot.position.set(x + width / 2, y - 30);
  }
}
