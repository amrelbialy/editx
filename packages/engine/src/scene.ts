import { Engine } from './engine';
import { RendererAdapter } from './render-adapter';

export class SceneAPI {
  #engine: Engine;

  constructor(engine: Engine) {
    this.#engine = engine;

    this.create = this.create.bind(this);
  }

  async create(layout: { width: number; height: number; background?: string }) {
    await this.#engine.createScene(layout);
  }
}
