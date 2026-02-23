import { Patch } from '../../history-manager';
import { Command } from './commands.types';

abstract class PatchCommand implements Command {
  abstract do(): Patch[];
}

export default PatchCommand;
