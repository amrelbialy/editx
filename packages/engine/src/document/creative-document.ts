import { EventBus } from '../events/event-bus';
import type { CreativeDocument as ICreativeDocument, Layer } from './document.types';

export class CreativeDocument implements ICreativeDocument {
  id: string;
  width: number;
  height: number;
  layers: Layer[];
  version: number;
  events: EventBus;

  constructor(id: string, width: number, height: number) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.layers = [];
    this.version = 0;
    this.events = new EventBus();
  }

  addLayer(layer: Layer): void {
    this.layers.push(layer);
    this.events.emit('layer:added', layer);
  }

  updateLayer(layerId: string, updates: Partial<Layer>): void {
    console.log('updateLayer', layerId, updates);
    const layer = this.layers.find((l) => l.id === layerId);
    if (!layer) return;

    Object.assign(layer, updates);

    if ('x' in updates || 'y' in updates || 'rotation' in updates) {
      this.events.emit('layer:update:transform', layer);
    }

    // console.log('updateLayer', layer);
    // console.log('this.layers', this.layers);
    // this.events.emit('layer:update', layer);
  }

  removeLayer(layerId: string): void {
    this.layers = this.layers.filter((l) => l.id !== layerId);
    this.events.emit('layer:remove', layerId);
  }

  getLayer(layerId: string): Layer | undefined {
    return this.layers.find((l) => l.id === layerId);
  }
}
