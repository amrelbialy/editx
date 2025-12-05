// src/bridge/EditorReactBridge.ts
import { throttle } from 'lodash-es';
import { useEditorStore } from './store/editor-store';
import { CreativeDocument } from '@creative-editor/engine';

export class EditorReactBridge {
  private unsubscribeFns: Array<() => void> = [];
  private notifyUi: () => void;

  constructor(private document: CreativeDocument) {
    // 30 FPS UI updates
    this.notifyUi = throttle(() => {
      useEditorStore.setState({
        transformTick: useEditorStore.getState().transformTick + 1,
      });
    }, 30);

    this.init();
  }

  private init() {
    // When layer selected
    const offSelect = this.document.events.on('layer:select', (id: string) => {
      useEditorStore.setState({ selectedLayerId: id });
      this.notifyUi();
    });

    // When layer properties change
    const offUpdate = this.document.events.on('layer:update:transform', () => {
      this.notifyUi(); // Throttled to 30 FPS
    });

    // Structural changes (add/remove)
    const offStructure = this.document.events.on('layer:structure', () => {
      this.notifyUi();
    });

    this.unsubscribeFns.push(offSelect, offUpdate, offStructure);
  }

  destroy() {
    this.unsubscribeFns.forEach((fn) => fn());
  }
}
