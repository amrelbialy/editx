import { CreateLayerCommand } from './controller/commands';
import { Layer } from './document/document.types';
import { Engine } from './engine';

export class LayerAPI {
  constructor(private engine: Engine) {}

  create(data) {
    const id = 'layer-1';

    const cmd = new CreateLayerCommand({
      id,
      layer: {
        id,
        type: data.type,
        props: data.props,
        transform: data.transform,
      },
    });

    console.log('cmd', cmd);
    this.engine.exec(cmd);

    return id;
  }

  setPosition(id: string, pos: { x?: number; y?: number }) {
    //   this.engine.exec(
    //     new UpdateNodeTransformCommand(id, pos)
    //   );
  }

  setProps(id: string, props: Record<string, any>) {
    //   this.engine.exec(
    //     new UpdateNodePropsCommand(id, props)
    //   );
  }

  remove(id: string) {
    //   this.engine.exec(
    //     new DeleteNodeCommand(id)
    //   );
  }

  get(id: string) {
    //   return this.engine.getDocument().nodes[id];
  }
}
