import { Patch } from '../../history-manager';

export interface Command {
  do(): Patch[];
}
