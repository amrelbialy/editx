import { Engine } from './engine';
import { PixiRendererAdapter } from './pixi-renderer-adapter';
import { EditorAPI } from './editor';
import { LayerAPI } from './layer';
import { SceneAPI } from './scene';
// import { SceneAPI } from './scene';
// import { AssetAPI } from './asset';
// import { VariableAPI } from './variable';
// import { EventAPI } from './event';

export class CreativeEngine {
  // Public API modules
  editor: EditorAPI;
  layer: LayerAPI;
  scene: SceneAPI;
  //   asset: AssetAPI;
  //   variable: VariableAPI;
  //   event: EventAPI;

  // Core engine (internal but exposed for debugging)
  core: Engine;

  private constructor(params: {
    core: Engine;
    editor: EditorAPI;
    layer: LayerAPI;
    scene: SceneAPI;
    //     asset: AssetAPI;
    //     variable: VariableAPI;
    //     event: EventAPI;
  }) {
    this.core = params.core;
    this.editor = params.editor;
    this.layer = params.layer;
    this.scene = params.scene;
    // this.scene = params.scene;
    // this.asset = params.asset;
    // this.variable = params.variable;
    // this.event = params.event;
  }

  // ⭐ IMG.LY-STYLE STATIC FACTORY ⭐
  static async create(opts: { container: HTMLElement; rendererInstance?: any }) {
    // // 1️⃣ Renderer creation
    // if (opts.rendererInstance) {
    //   adapter = opts.rendererInstance;
    //   if (adapter.init) await adapter.init({ root: opts.container });
    // } else {
    const adapter = new PixiRendererAdapter();
    await adapter.init({ root: opts.container });

    // 2️⃣ Engine core creation
    const core = new Engine({
      renderer: adapter,
    });

    // 3️⃣ API modules attached
    const editor = new EditorAPI(core);
    const layer = new LayerAPI(core);
    const scene = new SceneAPI(core);
    // const scene = new SceneAPI(core);
    // const asset = new AssetAPI(core);
    // const variable = new VariableAPI(core);
    // const event = new EventAPI(core);

    // 4️⃣ Return facade instance
    return new CreativeEngine({
      core,
      editor,
      layer,
      scene,
      // asset,
      // variable,
      //   event,
    });
  }
}
