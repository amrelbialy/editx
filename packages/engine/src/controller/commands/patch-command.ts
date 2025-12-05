import { CreativeDocument } from '../../document/creative-document';
import { Patch } from '../../history-manager';
import { Command } from './commands.types';

abstract class PatchCommand implements Command {
  abstract do(doc: CreativeDocument): Patch[];
  abstract undo(doc: CreativeDocument): Patch[];
}

export default PatchCommand;
