import { SetPropertyCommand } from "../controller/commands";
import type { Engine } from "../engine";
import type { Color, PropertyValue } from "./block.types";

/** Shared property-access helpers used by all sub-APIs. */

export function getProperty(engine: Engine, id: number, key: string): PropertyValue | undefined {
  return engine.getBlockStore().getProperty(id, key);
}

export function setProperty(engine: Engine, id: number, key: string, value: PropertyValue): void {
  engine.exec(new SetPropertyCommand(engine.getBlockStore(), id, key, value));
}

export function getFloat(engine: Engine, id: number, key: string): number {
  return engine.getBlockStore().getFloat(id, key);
}

export function setFloat(engine: Engine, id: number, key: string, value: number): void {
  setProperty(engine, id, key, value);
}

export function getBool(engine: Engine, id: number, key: string): boolean {
  return engine.getBlockStore().getBool(id, key);
}

export function setBool(engine: Engine, id: number, key: string, value: boolean): void {
  setProperty(engine, id, key, value);
}

export function getString(engine: Engine, id: number, key: string): string {
  return engine.getBlockStore().getString(id, key);
}

export function setString(engine: Engine, id: number, key: string, value: string): void {
  setProperty(engine, id, key, value);
}

export function getColor(engine: Engine, id: number, key: string): Color {
  return engine.getBlockStore().getColor(id, key);
}

export function setColor(engine: Engine, id: number, key: string, value: Color): void {
  setProperty(engine, id, key, value);
}
