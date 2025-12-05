import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  RenderLayer,
  // settings as pixiSettings,
} from 'pixi.js';

import type { RendererAdapter } from './render-adapter';
import { initDevtools } from '@pixi/devtools';

export class PixiRendererAdapter implements RendererAdapter {
  #app!: Application;
  #rootEl!: HTMLElement;

  // Page management
  #pageContainers = new Map<string, Container>(); // full containers for each page (used for rendering preview and to swap into stage)
  #pagePreviewSprites = new Map<string, Sprite>(); // cached low-cost Sprite previews for non-active pages
  #thumbnailCache = new Map<string, Texture>(); // cached RTs
  #activePageId: string | null = null;

  #layerMap = new Map<string, Container | Sprite | Graphics | Text>();

  // Overlay UI layers (always on stage)
  #transformerLayer!: Container;
  #guidesLayer!: Container;
  #overlayLayer!: Container;

  // Camera / viewport
  #camera = new Container();
  #zoom = 1;
  #pan = { x: 0, y: 0 };

  // Settings
  thumbnailScale = 0.2; // default scale for previews
  thumbnailPadding = 24; // padding used when fitting page previews

  async init({ root }: { root: HTMLElement }): Promise<void> {
    this.#rootEl = root;

    // Improve crispness when using devicePixelRatio
    // pixiSettings.RESOLUTION = devicePixelRatio || 1;

    this.#app = new Application();
    // await this.#app.init({
    //   background: 'black',
    //   resizeTo: root,
    //   width: 600,
    //   height: 600,
    // });
    console.log('root', this.#rootEl);
    console.log('init', this.#app);
    initDevtools({ app: this.#app });

    // this.#app.stage.addChild(this.#camera);
    // root.appendChild(this.#app.canvas);
  }

  // -------------------------
  // Scene / Page management
  // -------------------------

  // NOT SURE IF IT IS NEEDED
  // setScene(scene: any | null): void {
  //   // Clear all if null
  //   if (!scene) {
  //     this._clearAllPages();
  //     this.#activePageId = null;
  //     this.renderFrame();
  //     return;
  //   }

  //   // Ensure containers exist for provided pages (but do not add to stage)
  //   for (const pageId of scene.pages) {
  //     if (!this.#pageContainers.has(pageId)) {
  //       // placeholder container; page content will be created when layers arrive
  //       this.#pageContainers.set(pageId, new Container());
  //     }
  //   }

  //   // Optionally create previews for non-active pages
  //   if (scene.activePageId) {
  //     this.setActivePage(scene.activePageId);
  //   }

  //   this.renderFrame();
  // }

  async createScene(layout: {
    width: number;
    height: number;
    background: string;
  }): Promise<void> {
    await this.#app.init({
      background: layout.background ?? '#ffffff',
      resizeTo: this.#rootEl,
      width: layout.width,
      height: layout.height,
    });

    this.#transformerLayer = new Container();
    this.#transformerLayer.label = 'Transformer';
    this.#transformerLayer.tint = 'blue';
    this.#guidesLayer = new Container();
    this.#guidesLayer.label = 'Guider';
    this.#guidesLayer.tint = 'green';
    this.#overlayLayer = new Container();
    this.#overlayLayer.label = 'Overlayer';
    this.#overlayLayer.tint = 'red';

    // overlay layers always above camera content
    this.#app.stage.addChild(this.#camera);
    this.#app.stage.addChild(this.#transformerLayer);
    this.#app.stage.addChild(this.#guidesLayer);
    this.#app.stage.addChild(this.#overlayLayer);

    this.createPage('1', {
      width: 100,
      height: 100,
      background: 'green',
    });

    console.log('createScene', {
      app: this.#app,
      camera: this.#camera,
      rootEl: this.#rootEl,
      transformerLayer: this.#transformerLayer,
      guidesLayer: this.#guidesLayer,
      overlayLayer: this.#overlayLayer,
    });

    // const renderLayer = new RenderLayer();
    // console.log('renderLayer', renderLayer, renderLayer.getGlobalTransform());
    // this.#app.stage.addChild(renderLayer);
    this.#rootEl.appendChild(this.#app.canvas);

    console.log('rootEl.clientWidth', this.#rootEl.clientWidth);
    console.log('rootEl.clientHeight', this.#rootEl.clientHeight);

    // this.renderFrame();
    // needs to create scene data structure and render logic
    // support multi page support in scene with caching but not for now but create the ground work for it
    // Focus on loading page with image to start image editor focus
    // add transformer layer for all layers
  }

  createPage(pageId: string, page: Container): void {
    if (this.#pageContainers.has(pageId)) return; // idempotent

    const container = new Container();
    container.label = `page:${pageId || 1}`;

    // create background rect for this page (first child)
    const bg = new Graphics();
    bg.rect(0, 0, page.width, page.height);
    bg.fill(page.background ?? '#ffffff');
    bg.interactive = false;
    container.addChild(bg);

    // add a dedicated "content" container (layers go above background)
    const content = new Container();
    content.label = 'content';
    container.addChild(content);

    // store container
    this.#pageContainers.set(pageId, container);
    console.log('createPage', container);
    this.#camera.addChild(container);
    // this._fitPagePosition(container); // optional: position page at center or configured layout

    this.showTransformerForLayer(pageId);
    // // create thumbnail proactively or lazily (we keep lazy behavior by default)
    // this.invalidateThumbnail(pageId);
  }

  //
  // LAYER MANAGEMENT
  //

  createLayer(id: string, layer: any): void {
    let obj;

    switch (layer.type) {
      case 'rect': {
        const g = new Graphics();
        g.rect(0, 0, layer.props.width, layer.props.height);
        g.fill(layer.props.fill ?? 0xffffff);
        obj = g;
        break;
      }

      case 'image': {
        obj = new Sprite(Texture.from(layer.props.src));
        break;
      }

      case 'text': {
        obj = new Text({
          text: layer.props.text,
          style: {
            fill: layer.props.color,
            fontSize: layer.props.fontSize,
          },
        });
        break;
      }

      default:
        obj = new Container();
    }

    this.#applyTransform(obj, layer);

    console.log('addChild', obj);
    this.#camera.addChild(obj);
    this.#layerMap.set(id, obj);
  }

  updateLayer(id: string, layer: any): void {
    const obj = this.#layerMap.get(id);
    console.log('getLayer', obj);
    if (!obj) return;

    if (layer.type === 'rect' && obj instanceof Graphics) {
      obj.clear();
      obj.rect(0, 0, layer.props.width, layer.props.height);
      obj.fill(layer.props.fill ?? 0xffffff);
    }

    if (layer.type === 'text' && obj instanceof Text) {
      obj.text = layer.props.text;
      obj.style.fill = layer.props.color;
      obj.style.fontSize = layer.props.fontSize;
    }

    if (layer.type === 'image' && obj instanceof Sprite) {
      const src = layer.props.src;
      if (obj.texture.textureCacheIds[0] !== src) {
        obj.texture = Texture.from(src);
      }
    }

    this.#applyTransform(obj, layer);
  }

  removeLayer(id: string): void {
    const obj = this.#layerMap.get(id);
    if (!obj) return;

    this.#camera.removeChild(obj);
    obj.destroy();
    this.#layerMap.delete(id);
  }

  // -------------------------
  // Transformer / selection UI
  // -------------------------

  showTransformerForLayer(layerId: string): void {
    console.log('layerId', layerId);
    console.log('layerMap', this.#layerMap);
    console.log('pageContainers', this.#pageContainers);
    const target = this.#layerMap.get(layerId) || this.#pageContainers.get(layerId);
    console.log('showTransformerForLayer', target);
    if (!target) return;
    // clear
    this.#transformerLayer.removeChildren();

    // bounding box
    const bounds = target.getBounds();
    console.log('bounds', bounds);
    const rect = new Graphics();
    rect.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    rect.fill('transparent');
    rect.setStrokeStyle({ width: 1, color: 0x007aff });
    // rect.zIndex = 1000;
    // rect.fill('transparent');
    // rect.endFill();

    // // simple handles: corners (visual only)
    // const handle = new Graphics();
    // handle.rect(bounds.x - 6, bounds.y - 6, 12, 12);
    // handle.fill('transparent');

    console.log('rect', rect);
    // console.log('handle', handle);
    this.#transformerLayer.addChild(rect);
    console.log('transformerLayer', this.#transformerLayer);
    // this.renderFrame();
  }

  //
  // CAMERA
  //

  setZoom(zoom: number): void {
    this.#zoom = zoom;
    this.#camera.scale.set(zoom);
  }

  getZoom(): number {
    return this.#zoom;
  }

  panTo(x: number, y: number): void {
    this.#pan = { x, y };
    this.#camera.position.set(x, y);
  }

  getPan() {
    return this.#pan;
  }

  fitToScreen({
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: number;
  }): void {
    const w = this.#rootEl.clientWidth - padding * 2;
    const h = this.#rootEl.clientHeight - padding * 2;

    const scale = Math.min(w / width, h / height);
    this.setZoom(scale);

    const offsetX = (this.#rootEl.clientWidth - width * scale) / 2;
    const offsetY = (this.#rootEl.clientHeight - height * scale) / 2;

    this.panTo(offsetX, offsetY);
  }

  centerOnRect(rect: { x: number; y: number; width: number; height: number }): void {
    const zoom = this.getZoom();

    const sceneCenterX = rect.x + rect.width / 2;
    const sceneCenterY = rect.y + rect.height / 2;

    const screenCenterX = this.#rootEl.clientWidth / 2;
    const screenCenterY = this.#rootEl.clientHeight / 2;

    const panX = screenCenterX - sceneCenterX * zoom;
    const panY = screenCenterY - sceneCenterY * zoom;

    this.panTo(panX, panY);
  }

  _fitPagePosition(container: Container) {
    // Position active page in center of root by default (you can add offsets based on scene)
    const rootW = this.#rootEl.clientWidth;
    const rootH = this.#rootEl.clientHeight;
    const bounds = container.getLocalBounds();
    container.position.set(
      (rootW - bounds.width * this.#camera.scale.x) / 2,
      (rootH - bounds.height * this.#camera.scale.y) / 2
    );
  }

  //
  // COORDINATE TRANSFORMS
  //

  screenToWorld(pt: { x: number; y: number }) {
    return {
      x: (pt.x - this.#pan.x) / this.#zoom,
      y: (pt.y - this.#pan.y) / this.#zoom,
    };
  }

  worldToScreen(pt: { x: number; y: number }) {
    return {
      x: pt.x * this.#zoom + this.#pan.x,
      y: pt.y * this.#zoom + this.#pan.y,
    };
  }

  // NOT NEEDED IF TICKER IS USED
  // renderFrame(): void {
  //   this.#app.render();
  // }

  dispose(): void {
    this.#app.destroy(true);
    this.#layerMap.clear();
  }

  //
  // Internal helper
  //

  #applyTransform(obj: any, layer: any) {
    obj.x = layer.transform.x ?? 0;
    obj.y = layer.transform.y ?? 0;
    obj.scale.x = layer.transform.scaleX ?? 1;
    obj.scale.y = layer.transform.scaleY ?? 1;
    obj.rotation = (layer.transform.rotation ?? 0) * (Math.PI / 180);
  }

  // -------------------------
  // Helpers
  // -------------------------
  _clearAllPages() {
    this.#pageContainers.forEach((c) => c.destroy({ children: true }));
    this.#pageContainers.clear();
    this.#pagePreviewSprites.forEach((s) => s.destroy({ children: true }));
    this.#pagePreviewSprites.clear();
    this.#thumbnailCache.forEach((rt) => rt.destroy(true));
    this.#thumbnailCache.clear();
    this.#layerMap.clear();
  }
}
