import { SetPagePropertiesCommand } from "./controller/commands/set-page-properties-command";
import type { EngineCore } from "./engine-core";
import {
  type PageProperties,
  type PagePropertiesUpdate,
  readPageProperties,
  requireScenePage,
} from "./page-properties";

export function getPageProperties(engine: EngineCore, pageId: number): PageProperties {
  return readPageProperties(
    requireScenePage(engine._getBlockStore(), engine.getActiveScene(), pageId),
  );
}

export function setPageProperties(
  engine: EngineCore,
  pageId: number,
  update: PagePropertiesUpdate,
): void {
  const command = new SetPagePropertiesCommand(
    engine._getBlockStore(),
    engine.getActiveScene(),
    pageId,
    update,
  );
  if (!command.hasChanges) return;
  engine.exec(command);
  engine._deferNotification(() => engine.emit("block:stateChanged", [pageId]));
}
