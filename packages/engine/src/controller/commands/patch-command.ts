import type { Patch } from "../../history-manager";
import type { Command } from "./commands.types";

export abstract class PatchCommand implements Command {
  abstract do(): Patch[];
}
