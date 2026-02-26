# Folder Structure

Actual monorepo layout after the codebase refactoring.

```
creative-editor/
  apps/
    demo/                          # Vite demo app
      src/
        app.tsx
        main.tsx

  packages/
    engine/                        # @creative-editor/engine — core library
      src/
        index.ts                   # Barrel export for the package
        creative-engine.ts         # Facade + factory (static create)
        engine.ts                  # Core orchestrator (commands, history, events)
        render-adapter.ts          # RendererAdapter interface
        scene.ts                   # Scene API
        editor.ts                  # Editor API
        event-api.ts               # Block lifecycle events
        history-manager.ts         # Undo/redo with typed Patch

        block/
          index.ts
          block.types.ts           # BlockData, BlockType, Color, PropertyValue
          block-defaults.ts        # Default properties per block type
          block-store.ts           # Core CRUD + facade (delegates below)
          block-hierarchy.ts       # Parent/child management
          block-properties.ts      # Typed property get/set
          block-snapshot.ts        # Deep-copy snapshot/restore for undo
          block-api.ts             # Command-dispatching public API

        controller/
          commands/
            commands.types.ts      # Command interface
            patch-command.ts       # Abstract PatchCommand
            create-block-command.ts
            destroy-block-command.ts
            set-property-command.ts
            set-kind-command.ts
            append-child-command.ts
            remove-child-command.ts
            index.ts

        events/
          event-bus.ts             # Typed EventBus (EventMap)

        konva/                     # Konva renderer (split from god class)
          index.ts
          konva-renderer-adapter.ts   # Slim orchestrator (~190 lines)
          konva-node-factory.ts       # Node creation + per-type updaters
          konva-interaction-handler.ts # Mouse/touch interaction + marquee select
          konva-camera.ts             # Viewport: zoom, pan, fit, coordinate transforms

        utils/                     # Shared utilities
          index.ts
          color.ts                 # colorToHex, hexToColor
          image-loader.ts          # Shared image cache + loader + URL helpers

    image-editor/                  # @creative-editor/image-editor
      src/
        index.ts
        image-editor.tsx           # Main ImageEditor component
        components/
          toolbar.tsx
        store/
          image-editor-store.ts    # Zustand store
        utils/
          load-image.ts            # Re-exports from engine/utils

    react-editor/                  # @creative-editor/react-editor
      src/
        index.ts
        styles.css
        components/
          creative-editor.tsx
          layer-panel.tsx
          properties-panel.tsx
          toolbar.tsx
        hooks/
          use-engine.ts
        store/
          editor-store.ts
        utils/
          cn.ts

  docs/
    MASTER_PLAN.md
    REFACTORING_PLAN.md
    features/
      01-load-image.md
      02-crop.md

  temp/
    filerobot-image-editor/        # Reference codebase (read-only)
```
