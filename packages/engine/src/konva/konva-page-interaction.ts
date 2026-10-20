import type Konva from "konva";
import { KonvaPageWrappers } from "./konva-page-wrappers";

export function isContinuousPageMode(mode: string | undefined): boolean {
  return mode === "vertical-pages" || mode === "horizontal-pages";
}

export function continuousPageIdFromTarget(
  target: Konva.Node,
  getMode: (() => string) | undefined,
): number | null {
  return isContinuousPageMode(getMode?.()) ? KonvaPageWrappers.pageIdFromNode(target) : null;
}

export function isPrimaryContact(event: MouseEvent | TouchEvent): boolean {
  if ("touches" in event) return event.touches.length === 1;
  return event.button === 0 && (!("isPrimary" in event) || event.isPrimary !== false);
}

export function isPrimaryCompletion(event: MouseEvent | TouchEvent): boolean {
  if ("touches" in event) {
    return (
      event.touches.length === 0 && (!event.changedTouches || event.changedTouches.length === 1)
    );
  }
  return event.button === 0 && (!("isPrimary" in event) || event.isPrimary !== false);
}
