// anchors/ResizeAnchor.ts
import { Graphics } from "pixi.js";

export class ResizeAnchor extends Graphics {
  constructor(id) {
    super();
    this.id = id;

    this.beginFill(0xffffff)
      .lineStyle(1, 0x00A8FF)
      .drawCircle(0, 0, 6)
      .endFill();

    this.eventMode = 'dynamic';
    this.cursor = this._cursorFor(id);

    this.on("pointerdown", this._start);
    this.on("pointermove", this._move);
    this.on("pointerup", this._end);
    this.on("pointerupoutside", this._end);
  }

  _cursorFor(id) {
    return {
      tl: 'nwse-resize',
      tr: 'nesw-resize',
      bl: 'nesw-resize',
      br: 'nwse-resize'
    }[id];
  }

  _start(e) {
    this.dragging = true;
    this.start = e.global.clone();
  }

  _move(e) {
    if (!this.dragging) return;

    const delta = {
      x: e.global.x - this.start.x,
      y: e.global.y - this.start.y
    };

    this.emit("drag", delta, this.id);
  }

  _end() { this.dragging = false; }
}
