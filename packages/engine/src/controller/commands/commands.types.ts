import { CreativeDocument } from '../../document/creative-document';
import { Patch } from '../../history-manager';

export interface Command {
  do(doc: CreativeDocument): Patch[];
  undo(doc: CreativeDocument): Patch[];
}
