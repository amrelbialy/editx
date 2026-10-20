export interface CameraAnimationState {
  zoom: number;
  pan: { x: number; y: number };
}

const ANIMATION_DURATION = 200;

export class KonvaCameraAnimation {
  #frameId: number | null = null;
  #version = 0;

  start(
    from: CameraAnimationState,
    target: CameraAnimationState,
    apply: (state: CameraAnimationState) => void,
  ): void {
    this.cancel();
    const version = this.#version;
    const startTime = performance.now();
    const tick = (now: number) => {
      if (version !== this.#version) return;
      const progress = Math.min((now - startTime) / ANIMATION_DURATION, 1);
      const amount = 1 - (1 - progress) ** 3;
      apply({
        zoom: from.zoom + (target.zoom - from.zoom) * amount,
        pan: {
          x: from.pan.x + (target.pan.x - from.pan.x) * amount,
          y: from.pan.y + (target.pan.y - from.pan.y) * amount,
        },
      });
      if (version !== this.#version) return;
      this.#frameId = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    this.#frameId = requestAnimationFrame(tick);
  }

  cancel(): void {
    this.#version++;
    if (this.#frameId === null) return;
    cancelAnimationFrame(this.#frameId);
    this.#frameId = null;
  }
}
