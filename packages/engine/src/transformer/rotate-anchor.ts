// anchors/RotateAnchor.ts
import { Graphics } from 'pixi.js';

export class RotateAnchor extends Graphics {
  constructor() {
    super();
    this.beginFill(0xffcc00).drawCircle(0, 0, 8).endFill();

    this.eventMode = 'dynamic';
    this.cursor = 'grab';

    this.on('pointerdown', this._start)
      .on('pointermove', this._move)
      .on('pointerup', this._end)
      .on('pointerupoutside', this._end);
  }

  _start(e) {
    this.dragging = true;
    this.startAngle = this.parent.rotation;
    this.startPos = e.global.clone();
  }

  _move(e) {
    if (!this.dragging) return;

    const center = this.parent.getGlobalPosition();
    const angle = Math.atan2(e.global.y - center.y, e.global.x - center.x);

    this.parent.rotation = angle;
    this.emit('rotate', angle);
  }

  _end() {
    this.dragging = false;
  }
}
