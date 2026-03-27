# Editx â€” Project Rules

## Overview

Monorepo for a block-based creative/image editor. Two publishable packages + one demo app.

- **`packages/engine`** â€” Core block-based engine. Konva 10 renderer, command pattern for undo/redo, EventAPI (Block Lifecycle).
- **`packages/image-editor`** â€” React 19 image editor component. Tailwind CSS 4, Radix UI primitives, Zustand, Lexical for rich text.
- **`apps/demo`** â€” Vite dev app that consumes image-editor.

## Commands

```bash
pnpm build # Build all packages (tsc via turborepo)
pnpm dev # Watch mode for all packages
pnpm test # Run all unit tests (Vitest)
pnpm test:coverage # Run tests with V8 coverage
pnpm format # Format all files (Biome)
pnpm lint # Lint all files (Biome)
pnpm check # Format + lint + import sorting in one pass (Biome)
```

### Per-package

```bash
pnpm --filter @editx/engine test
pnpm --filter @editx/image-editor test
pnpm --filter @editx/image-editor test:e2e # Playwright CT (when set up)
```

## Architecture

```
packages/engine â†’ pure TypeScript, no React dependency
packages/image-editor â†’ depends on engine (workspace:*), React 19
apps/demo â†’ depends on image-editor, Vite
```

Toolchain: pnpm 10.23 + turborepo, TypeScript strict, Vitest + happy-dom for tests.

## File Style Rules

- **Max 250 lines per file** (components, hooks, utils). Split by concern before adding more code.
- **One React component per file**. Co-located types and small helpers are fine.
- **One concern per hook**. Compose via aggregator hooks.
- **CSS Container Queries** (`@container/editor` + `@3xl/editor:`) over viewport breakpoints or JS detection â€” the editor must adapt to its own container size, not the viewport.
- **No `console.log` in production code** â€” use `__EX_PERF` flag for perf instrumentation.

## Coding Conventions

- TypeScript strict, no `any` at public API boundaries.
- **Formatter/Linter**: Biome. Run `pnpm check` before committing.
- CSS: Tailwind utility classes + CSS variables for theming (no CSS-in-JS).
- State: Zustand for UI state, engine commands for document state.
- All document mutations go through the engine command system (undoable).
- Tests: Vitest, co-located test files (`*.test.ts` / `*.test.tsx`).

### Hook ordering inside components

Separate groups with a blank line:

1. `useRef` / refs
2. Custom hooks (`useEngine`, `useCropTool`, etc.)
3. `useState`
4. `useMemo` / `useCallback`
5. `useEffect`

### Component signature

Props on a separate line, destructured on the first line of the body:

```tsx
export const MyComponent: React.FC<MyComponentProps> = (props) => {
 const { label, value, onChange } = props;
 // ...
};
```

### UI component structure (folder-per-component)

```
components/ui/{name}/
 {name}.component.tsx # Implementation
 {name}.types.ts # Props interface (if needed)
 {name}.constants.ts # CVA variants, enums (if needed)
 index.ts # Barrel export
```

Naming follows interaction-based conventions (e.g., `input-group` not `number-field`, `section` not `panel-section`).

## Key References

- block-based editor API patterns (for engine API design)
- Scaleflex UI Kit in `temp/ui-kit/` (for UI component naming/structure conventions)
- 
