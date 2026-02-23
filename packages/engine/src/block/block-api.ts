import { Engine } from '../engine';
import {
  CreateBlockCommand,
  DestroyBlockCommand,
  SetPropertyCommand,
  AppendChildCommand,
  RemoveChildCommand,
} from '../controller/commands';
import { BlockType, Color, PropertyValue } from './block.types';

export class BlockAPI {
  #engine: Engine;

  constructor(engine: Engine) {
    this.#engine = engine;
  }

  // --- Lifecycle ---

  create(type: BlockType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  destroy(id: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new DestroyBlockCommand(store, id));
  }

  // --- Type / Kind ---

  getType(id: number): BlockType | undefined {
    return this.#engine.getBlockStore().getType(id);
  }

  getKind(id: number): string {
    return this.#engine.getBlockStore().getKind(id);
  }

  setKind(id: number, kind: string): void {
    const store = this.#engine.getBlockStore();
    // Kind is stored on the block directly, use a property for undo
    const before = store.snapshot(id);
    store.setKind(id, kind);
    const after = store.snapshot(id);
    if (before && after) {
      // Push through engine so it gets into history and flushes
      this.#engine.exec({
        do: () => [{ id: String(id), before, after }],
      });
    }
  }

  // --- Hierarchy ---

  appendChild(parent: number, child: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new AppendChildCommand(store, parent, child));
  }

  removeChild(parent: number, child: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new RemoveChildCommand(store, parent, child));
  }

  getParent(id: number): number | null {
    return this.#engine.getBlockStore().getParent(id);
  }

  getChildren(id: number): number[] {
    return this.#engine.getBlockStore().getChildren(id);
  }

  // --- Property getters ---

  getFloat(id: number, key: string): number {
    return this.#engine.getBlockStore().getFloat(id, key);
  }

  getString(id: number, key: string): string {
    return this.#engine.getBlockStore().getString(id, key);
  }

  getBool(id: number, key: string): boolean {
    return this.#engine.getBlockStore().getBool(id, key);
  }

  getColor(id: number, key: string): Color {
    return this.#engine.getBlockStore().getColor(id, key);
  }

  // --- Property setters ---

  setFloat(id: number, key: string, value: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, key, value));
  }

  setString(id: number, key: string, value: string): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, key, value));
  }

  setBool(id: number, key: string, value: boolean): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, key, value));
  }

  setColor(id: number, key: string, value: Color): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, key, value));
  }

  // --- Convenience setters (batched for single undo step) ---

  setPosition(id: number, x: number, y: number): void {
    this.#engine.beginBatch();
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/position/x', x));
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/position/y', y));
    this.#engine.endBatch();
  }

  setSize(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/size/width', width));
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/size/height', height));
    this.#engine.endBatch();
  }

  setRotation(id: number, degrees: number): void {
    this.setFloat(id, 'transform/rotation', degrees);
  }

  setOpacity(id: number, opacity: number): void {
    this.setFloat(id, 'appearance/opacity', opacity);
  }

  setVisible(id: number, visible: boolean): void {
    this.setBool(id, 'appearance/visible', visible);
  }

  // --- Query ---

  exists(id: number): boolean {
    return this.#engine.getBlockStore().exists(id);
  }

  findByType(type: BlockType): number[] {
    return this.#engine.getBlockStore().findByType(type);
  }

  findByKind(kind: string): number[] {
    return this.#engine.getBlockStore().findByKind(kind);
  }

  getPropertyKeys(id: number): string[] {
    return this.#engine.getBlockStore().getPropertyKeys(id);
  }
}
