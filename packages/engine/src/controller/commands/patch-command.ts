import type { Patch } from "../../history-manager";
import type { Command } from "./commands.types";

abstract class PatchCommand implements Command {
  abstract do(): Patch[];
}

export default PatchCommand;
