# Creative Editor SDK

A web-based Creative Editor SDK built with TypeScript, React, and PixiJS.

## Structure

- `packages/types` - Shared TypeScript types
- `packages/engine` - Core logic (CreativeDocument, layers, commands, undo/redo)
- `packages/renderer` - PixiJS WebGL renderer
- `packages/react-editor` - React wrapper with UI components
- `apps/demo` - Demo application

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run demo app
pnpm --filter demo dev
```

## Development

```bash
# Run all dev servers
pnpm dev

# Run specific package
pnpm --filter <package-name> dev
```

