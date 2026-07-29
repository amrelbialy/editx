# Editx — Project Rules

## Overview

Monorepo for a block-based creative/image editor. Two publishable packages + one demo app.

- **`packages/engine`** — Core block-based engine. Konva 10 renderer, command pattern for undo/redo, EventAPI (Block Lifecycle).
- **`packages/image-editor`** — React 19 image editor component. Tailwind CSS 4, Radix UI primitives, Zustand, Lexical for rich text.
- **`apps/demo`** — Vite dev app that consumes image-editor.

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
packages/engine → pure TypeScript, no React dependency
packages/image-editor → depends on engine (workspace:*), React 19
apps/demo → depends on image-editor, Vite
```

Toolchain: pnpm 10.23 + turborepo, TypeScript strict, Vitest + happy-dom for tests.

**Feature map:** `docs-private/FEATURE_MAP.md` is the index of every feature, where it lives (UI hook/panel ↔ engine API/command), and what depends on what. **Read it before touching an unfamiliar area, and update it when a feature lands, moves, or is removed.**

## File Style Rules

- **Max 250 lines per file** (components, hooks, utils). Split by concern before adding more code.
- **One React component per file**. Co-located types and small helpers are fine.
- **One concern per hook**. Compose via aggregator hooks.
- **CSS Container Queries** (`@container/editor` + `@3xl/editor:`) over viewport breakpoints or JS detection — the editor must adapt to its own container size, not the viewport.
- **No `console.log` in production code** — use `__EX_PERF` flag for perf instrumentation.

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

Naming follows interaction-based conventions (e.g., `input` not `number-field`, `section` not `panel-section`).

## Design System

All UI primitives live in `packages/image-editor/src/components/ui/` and must stay **pure and portable** (no `i18n/`, `engine`, `config/`, or app-hook imports) so they can be extracted into a standalone `@editx/ui` package later. App concerns (labels, handlers, icons) are injected via props. Import primitives from the `ui` barrel (`../ui`).

**Use primitives, never raw elements:**

- Buttons → `Button`. Icon-only buttons → `IconButton` (tooltip + `aria-label` baked in). **Never** use the native `title` attribute for icon buttons.
- Text/number fields → `Input` (one component; switch behavior with the `type` prop — there is no separate `NumberField`).
- Color inputs → `ColorSwatch` (never hand-roll `<input type="color">` outside `ui/`).
- Tab/option toggles → `SegmentedControl`. Selects → `Select`. Toggles → `SwitchField`.

**Shared style tokens** live in `ui/styles.ts` — compose them with `cn()`, never re-write the class strings inline:

- `focusRing` — the one focus ring for every interactive control (2px ring + 2px offset).
- `controlBase` — canonical surface for text-like controls (height, border, `bg-muted`, padding, text size).
- `interactiveBase` — cursor/disabled behavior for custom interactive elements.

**Spacing vocabulary** (use these exact tokens for consistency):

| Slot | Token |
|---|---|
| Control height | `h-8` |
| Control padding-x | `px-2` |
| Panel padding | `p-3` |
| Section gap | `gap-3` |
| Row gap | `gap-2` |
| Inline (label/control) | `gap-1.5` |
| Label column | `w-12` |

## Key References

- `docs-private/FEATURE_MAP.md` — feature tree, dependency map, extensibility surface (keep updated)
- block-based editor API patterns (for engine API design)
- Scaleflex UI Kit in `temp/ui-kit/` (for UI component naming/structure conventions)
- 
