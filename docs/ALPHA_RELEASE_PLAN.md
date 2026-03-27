# Alpha Release Plan (`0.1.0-alpha.1`)

Prepare the editx for first alpha npm publish. Three tracks: **code quality** (file structure + code review), **feature completion** (export dialog), and **publish hygiene** (packaging, dependencies, README, LICENSE). Pen/freehand deferred to beta.

---

## Phase 0: Project Rules & Conventions âœ… DONE

**0a. Create `CLAUDE.md`** at project root â€” project rules loaded by Claude-based agents

Contents:

- Project overview (monorepo: engine + image-editor, Konva renderer, React + Tailwind + Radix)
- Build/test/dev commands (`pnpm build`, `pnpm test`, `pnpm dev`, etc.)
- Architecture summary (packages/engine â†’ packages/image-editor â†’ apps/demo)
- **File style rules:**
  - Max 250 lines per file (components, hooks, utils)
  - If a file exceeds 250 lines, split by concern before adding more code
  - One React component per file (co-located types/helpers are fine)
  - Hooks: one concern per hook; compose via aggregator hooks
  - Prefer CSS Container Queries (`@container/editor` + `@md/editor:`) over viewport breakpoints or JS detection â€” the editor must adapt to its own container size, not the viewport
  - No `console.log` in production code â€” use `__EX_PERF` flag for perf instrumentation
- Coding conventions:
  - TypeScript strict, no `any` at public API boundaries
  - CSS: Tailwind utility classes + CSS variables for theming (no CSS-in-JS)
  - State: Zustand for UI state, engine commands for document state
  - All document mutations go through engine command system (undoable)
  - **Formatter/Linter**: Biome (single tool for format + lint, replaces Prettier + ESLint)
  - Tests: Vitest, co-located test files (`*.test.ts` / `*.test.tsx`)
  - **Hook ordering** inside components (with blank line between groups):
    1. `useRef` / refs
    2. Custom hooks (`useEngine`, `useCropTool`, etc.)
    3. `useState`
    4. `useMemo` / `useCallback`
    5. `useEffect`
  - **Component signature** â€” props on a separate line, destructured on the first line of the body:
    ```tsx
    export const MyComponent: React.FC<MyComponentProps> = (props) => {
      const { label, value, onChange } = props;
      // ...
    };
    ```
- Key references: img.ly CE.SDK API patterns, filerobot for math/logic reference

**0b. Create `.github/copilot-instructions.md`** â€” auto-loaded by VS Code Copilot

- Points to `CLAUDE.md` for full rules
- Repeats the critical rules inline (file size limit, Tailwind-first responsive, command system)

---

## Phase 1: Code Cleanup & Dead Dependencies âœ… DONE

1. **Delete `packages/react-editor/` entirely** â€” no code imports it; image-editor is fully independent
   - Delete the directory
   - Remove from `apps/demo/package.json` dependencies
   - Remove CSS import from `apps/demo/src/index.css` (`@import '@editx/react-editor/styles.css'`)
   - Remove path mapping from `apps/demo/tsconfig.json`
   - Remove vite alias from `apps/demo/vite.config.ts`
   - Run `pnpm install` to regenerate lock file

2. **Remove `pixi.js` from remaining dependencies**
   - `packages/engine/package.json` â€” remove `pixi.js`
   - Root `package.json` â€” remove `@pixi/devtools`

3. **Remove debug `console.log` statements from engine** (~12 occurrences)
   - `packages/engine/src/engine.ts` â€” 1 perf log
   - `packages/engine/src/konva/webgl-filter-renderer.ts` â€” 3 perf logs
   - `packages/engine/src/konva/konva-node-factory.ts` â€” 7 perf logs
   - Gate all behind `__EX_PERF` flag consistently (some already are, some aren't)

4. **Fix root `tsconfig.json` excludes** â€” add `"exclude": ["**/dist", "**/coverage", "**/node_modules", "temp"]` to eliminate 1,278 "cannot overwrite" errors

5. **Setup Biome** â€” single tool for formatting + linting (replaces need for Prettier + ESLint)
   - Install: `pnpm add -Dw @biomejs/biome`
   - Create `biome.json` at project root with:
     - `formatter.indentStyle: "space"`, `formatter.indentWidth: 2`, `formatter.lineWidth: 100`
     - `linter.enabled: true` with recommended rules
     - `organizeImports.enabled: true`
     - `files.ignore: ["temp/**", "**/dist/**", "**/coverage/**", "**/node_modules/**"]`
   - Add scripts to root `package.json`:
     - `"format": "biome format --write ."`
     - `"lint": "biome lint ."`
     - `"check": "biome check --write ."` (format + lint + import sorting in one pass)
   - Remove ESLint config/deps from `apps/demo/package.json` (the only place ESLint exists)
   - Run `biome check --write .` once to format entire codebase consistently
   - Add `biome ci .` to CI (Phase 7) â€” fails on unformatted/unlinted code

---

## Phase 2: Image-Editor File Structure Refactoring âœ… DONE

### 2A. Container-query responsive layout (SDK-friendly) âœ…

Replace the `useResponsive()` + `isMobile` conditional rendering pattern with **CSS Container Queries** (`@container`). This makes the editor respond to its **own container size**, not the viewport â€” critical for SDK usage where the editor may be embedded in a sidebar, modal, or partial-width area.

Tailwind 4 supports container queries natively via `@container` variants.

**Key change**: `EditorShell` becomes a named container. All child layout uses `@md/editor:` instead of `md:`.

```tsx
// EditorShell root div:
<div className="@container/editor flex flex-col h-full w-full">
```

| SDK usage                                  | Editor width | Layout                     |
| ------------------------------------------ | ------------ | -------------------------- |
| `width="100%" height="100vh"` (fullscreen) | ~1200px      | Desktop: sidebar + panels  |
| `width="400px" height="600px"` (modal)     | 400px        | Mobile: bottom bar + sheet |
| `width="100%"` in a 500px sidebar          | 500px        | Mobile layout              |
| `width="900px"` embedded                   | 900px        | Desktop layout             |

5. **Merge `ToolSidebar` + `MobileToolbar` â†’ `<ToolNav>`** â€” single component, one tool list defined once
   - New file: `packages/image-editor/src/components/shell/tool-nav.tsx`
   - Narrow container: horizontal bottom bar (`flex justify-around border-t`)
   - Wide container: vertical left sidebar (`@md/editor:flex-col @md/editor:w-[52px] @md/editor:border-r`)
   - Delete `mobile-toolbar.tsx` and `tool-sidebar.tsx` after migration
   - Tool list currently duplicated in both files â€” unified into one `allTools[]`

6. **Merge `ToolPanel` + `ToolSheet` â†’ `<ToolPanelResponsive>`** â€” single component
   - Modify existing `packages/image-editor/src/components/shell/tool-panel.tsx`
   - Narrow container: bottom sheet with backdrop (`fixed bottom-0 left-0 right-0 z-40 max-h-[60vh] rounded-t-xl`)
   - Wide container: side panel (`@md/editor:relative @md/editor:w-[280px] @md/editor:border-r @md/editor:rounded-none`)
   - Backdrop div uses `@md/editor:hidden` (only visible when editor is narrow)
   - Delete `tool-sheet.tsx` after migration

7. **Create `<ActiveToolContent>`** â€” extract the ~95 lines of conditional panel rendering (CropPanel, RotatePanel, etc.)
   - New file: `packages/image-editor/src/components/shell/active-tool-content.tsx`
   - Rendered once inside `<ToolPanelResponsive>` (no more duplication)

8. **Create `<PropertySubPanels>`** â€” extract the 9-way property side panel conditional (~70 lines)
   - New file: `packages/image-editor/src/components/shell/property-sub-panels.tsx`
   - Rendered inside `<ToolPanelResponsive>` when `propertySidePanel` is set

9. **Delete `useResponsive` hook** â€” no longer needed; container queries handle all responsive behavior
   - Remove `hooks/use-responsive.ts`
   - Remove from `index.ts` exports (breaking change â€” document in changelog)
   - If any edge case needs JS container width, use `ResizeObserver` on the shell ref (not `window.innerWidth`)

### 2B. Break up `image-editor.tsx` (632 lines â†’ ~250) âœ…

10. **Extract `useEditorZoom` hook** â€” zoom state + 7 callbacks + 2 effects (~60 lines)
    - New file: `packages/image-editor/src/hooks/use-editor-zoom.ts`
    - Returns `{ zoomLabel, handleZoomIn, handleZoomOut, handleAutoFitPage, handleFitPage, handleFitSelection, handleZoomPreset, handleZoom100 }`

11. **Split `useEngine` hook (372 lines â†’ 2-3 hooks)**
    - `useImageSource()` â€” validation, orientation correction, downscaling, source identity tracking
    - `useEngineLifecycle()` â€” engine create/init/dispose, canvas container management
    - `useEngineInputs()` â€” drag/drop/paste handlers
    - Keep `useEngine` as a thin aggregator that composes these

12. **Extract `<CanvasBlockOverlay>`** â€” floating block action bar positioning (~35 lines)
    - New file: `packages/image-editor/src/components/shell/canvas-block-overlay.tsx`
    - Currently inline as `overlay` prop of `<CanvasArea>`

### 2C. Resulting parent layout in `image-editor.tsx` âœ…

After all extractions, the JSX becomes:

```
<Providers>
  <EditorShell>
    <Topbar ... />
    <div className="flex flex-col-reverse @md/editor:flex-row flex-1 overflow-hidden">
      <ToolNav ... />
      <ToolPanelResponsive ...>
        {propertySidePanel ? <PropertySubPanels /> : <ActiveToolContent />}
      </ToolPanelResponsive>
      <CanvasArea ...>
        <TextEditorOverlay />
      </CanvasArea>
    </div>
    <LoadingOverlay />
    <ErrorOverlay />
  </EditorShell>
</Providers>
```

No `isMobile` checks. No duplicated panel content. No viewport dependency. ~250 lines.
Editor layout adapts to its own container width â€” works correctly at any embedding size.

### 2D. Add barrel exports for internal modules (deferred to Phase 3+)

13. **Add `index.ts` barrel files** to:
    - `components/panels/index.ts`
    - `components/shell/index.ts`
    - `components/ui/index.ts`
    - `hooks/index.ts`
    - Reduces import verbosity in `image-editor.tsx` (currently 30+ individual imports)

---

## Phase 3: Shared UI Component Layer âœ… DONE

Goal: All panels and bars use a shared set of compound UI components from `components/ui/`. Future-proof for extracting into a standalone `@editx/ui` package.

**Reference**: Scaleflex UI Kit (`temp/ui-kit/packages/ui/`) â€” naming and file structure conventions.

### 3A. Adopt UI Kit file structure for ALL ui components

Restructure `components/ui/` from flat files to folder-per-component:

```
components/ui/
  {name}/
    {name}.component.tsx    # Implementation
    {name}.types.ts         # Props interface (if needed)
    {name}.constants.ts     # CVA variants, enums (if needed)
    index.ts                # Barrel export
```

Migrate existing components to this structure first:

- `button.tsx` â†’ `button/button.component.tsx` + `button/index.ts`
- `slider.tsx` â†’ `slider/slider.component.tsx` + `slider/index.ts`
- `select.tsx` â†’ `select/select.component.tsx` + `select/index.ts`
- `popover.tsx` â†’ `popover/popover.component.tsx` + `popover/index.ts`
- `dropdown-menu.tsx` â†’ `dropdown-menu/dropdown-menu.component.tsx` + `dropdown-menu/index.ts`
- `separator.tsx` â†’ `separator/separator.component.tsx` + `separator/index.ts`
- `scroll-area.tsx` â†’ `scroll-area/scroll-area.component.tsx` + `scroll-area/index.ts`
- `tooltip.tsx` â†’ `tooltip/tooltip.component.tsx` + `tooltip/index.ts`
- `spinner.tsx` â†’ `spinner/spinner.component.tsx` + `spinner/index.ts`
- Update all import paths across the codebase after restructuring

### 3B. New shared components (named following UI Kit conventions)

14. **`ui/color-picker/`** â€” unified color picker with palette + hex input + opacity slider
    - `color-picker.component.tsx`, `color-picker.types.ts`, `index.ts`
    - Currently duplicated across: `color-property-panel.tsx`, `background-property-panel.tsx`, `text-edit-toolbar.tsx`
    - Props: `color`, `opacity?`, `onChange`, `onOpacityChange?`, `swatches?`, `showHexInput?`

15. **`ui/color-palette/`** â€” grid of color swatches (sub-component of color-picker, also usable standalone)
    - `color-palette.component.tsx`, `color-palette.types.ts`, `index.ts`
    - Identical 25-line block currently duplicated in 2 files
    - Props: `colors`, `value`, `onSelect`, `className?`
    - Named "color-palette" per UI Kit convention (not "color-swatch-grid")

16. **`ui/slider-field/`** â€” label + value display + Slider compound component
    - `slider-field.component.tsx`, `slider-field.types.ts`, `index.ts`
    - 19+ instances across 6 panels (adjust-panel alone has 12)
    - Props: `label`, `value`, `min`, `max`, `step`, `onChange`, `onCommit?`, `formatValue?`
    - Replaces `AdjustSlider` sub-component and all inline labeled sliders

17. **`ui/input-group/`** â€” input with prefix/suffix adornments (label, unit like "px"/"Â°")
    - `input-group.component.tsx`, `input-group.types.ts`, `index.ts`
    - 7+ instances across crop-panel, shadow-property-panel, position-property-panel, text-properties-panel
    - Props: `label?`, `value`, `onChange`, `type?`, `min?`, `max?`, `step?`, `suffix?` (unit), `prefix?`
    - Named "input-group" per UI Kit convention (not "number-field")

18. **`ui/section/`** â€” content section with header label + optional separator
    - `section.component.tsx`, `section.types.ts`, `index.ts`
    - 10+ variations across all panels (currently inline `text-xs font-medium` + children)
    - Props: `label`, `children`, `separator?`
    - Named "section" per UI Kit convention (not "panel-section")

19. **`ui/switch-field/`** â€” switch + label + conditional children
    - `switch-field.component.tsx`, `switch-field.types.ts`, `index.ts`
    - 3 instances: stroke-property-panel, shadow-property-panel, background-property-panel
    - Props: `label`, `checked`, `onChange`, `children`
    - Named "switch-field" per UI Kit form-field pattern (not "toggle-row")

20. **`ui/selection-grid/`** â€” grid of selectable icon+label items
    - `selection-grid.component.tsx`, `selection-grid.types.ts`, `index.ts`
    - 3 instances: crop-panel presets, shapes-panel, text-panel
    - Props: `items: { id, label, icon }[]`, `activeId?`, `onSelect`, `columns?`
    - Named "selection-grid" (interaction-based name, not "preset-grid")

21. **Add `icon` size variant to existing `button/`** â€” no separate "action-button" component
    - Add `ButtonSize.Icon` variant to button constants (like UI Kit's `IconXs`, `IconSm`, `IconMd`)
    - block-action-bar and position-property-panel use `<Button size="icon">` + tooltip
    - Eliminates need for separate "action-button" component

### 3C. Standardize panel layout

22. **Consistent spacing** â€” all panels use `gap-4` between sections (currently varies gap-2 to gap-4)
    - Update: adjust-panel (gap-2 â†’ gap-4), crop-panel (mixed â†’ gap-4), rotate-panel (already gap-4)

### 3D. Refactor panels to use shared components

23. **Update all panels** to import from `components/ui/` instead of inline patterns:
    - `adjust-panel.tsx` â€” replace `AdjustSlider` with `<SliderField>` (12 instances)
    - `color-property-panel.tsx` â€” replace inline color picker + swatch grid with `<ColorPicker>` + `<ColorPalette>`
    - `background-property-panel.tsx` â€” replace duplicated swatch grid with `<ColorPicker>` + `<ColorPalette>`
    - `stroke-property-panel.tsx` â€” use `<SwitchField>` + `<SliderField>`
    - `shadow-property-panel.tsx` â€” use `<SwitchField>` + `<InputGroup>` + `<SliderField>`
    - `position-property-panel.tsx` â€” use `<InputGroup>` for coords, `<Button size="icon">` for z-order
    - `text-properties-panel.tsx` â€” use `<Section>`, `<SliderField>` (3 instances)
    - `crop-panel.tsx` â€” use `<InputGroup>` for dimensions, `<SelectionGrid>` for presets
    - `shapes-panel.tsx` â€” use `<SelectionGrid>`
    - `text-panel.tsx` â€” use `<SelectionGrid>`
    - `text-edit-toolbar.tsx` â€” use `<ColorPicker>` for color dropdown
    - `block-action-bar.tsx` â€” use `<Button size="icon">` + `<Tooltip>`

---

## Phase 4: Engine Code Review & Structure âœ… DONE

24. **Split `block-api.ts` (~1200 lines)** â€” currently a god object handling: property get/set, selection, shapes, fills, effects, strokes, shadows, z-order, duplication, text editing, alignment. Split into focused sub-API modules:
    - `block-api.ts` â€” thin facade that delegates to sub-APIs (keeps the public `engine.block.*` surface)
    - `block-property-api.ts` â€” getFloat/setFloat, getString/setString, getBool/setBool, generic property access
    - `block-shape-api.ts` â€” create shapes, setKind, shape-specific defaults
    - `block-fill-api.ts` â€” fill color, gradient, image fills
    - `block-effect-api.ts` â€” effects CRUD (create, append, remove, reorder)
    - `block-stroke-api.ts` â€” stroke enable/disable, width, color
    - `block-shadow-api.ts` â€” shadow enable/disable, offset, blur, color
    - `block-layout-api.ts` â€” position, size, rotation, z-order, alignment
    - `block-crop-api.ts` â€” crop properties, crop math, resetCrop, adjustCropToFillFrame
    - `block-text-api.ts` â€” text editing, text runs, font properties
    - `block-selection-api.ts` â€” selection state, multi-select, find by type
    - Each sub-API file should be under 250 lines
    - All existing tests in `block-api.test.ts` must continue to pass (test through the facade)

---

## Phase 5: Export Format Dialog âœ… DONE

25. **Create export dialog modal** with format/quality picker
    - New file: `packages/image-editor/src/components/panels/export-dialog.tsx`
    - Format selector: PNG / JPEG / WEBP (from `config.export.formats`)
    - Quality slider for JPEG/WEBP (0.1â€“1.0) â€” uses new `<SliderField>` from Phase 3
    - Filename input â€” uses new `<InputGroup>` or plain input
    - "Save" button triggers `useExport.handleExport()` with selected options
    - Wire into topbar "Export Image" button â†’ opens dialog instead of direct export
    - Use existing Radix `Dialog` primitive

---

## Phase 6: Testing Strategy

**Current state**: Vitest unit tests for engine (commands, blocks, events, undo/redo) and image-editor (component render, utility functions). Uses happy-dom â€” cannot test real Canvas/Konva rendering or multi-step user flows.

### 6A. Add Playwright Component Tests (high priority)

Playwright Component Testing renders real React components in a real browser â€” Canvas and Konva actually work, unlike happy-dom. Best ROI for a solo developer: one test covers what would take 5+ minutes of manual clicking.

31. **Setup Playwright CT**
    - Install: `@playwright/test`, `@playwright/experimental-ct-react`
    - Config: `packages/image-editor/playwright-ct.config.ts`
    - Test fixtures: 2-3 small test images in `packages/image-editor/tests/fixtures/`
    - Script: `"test:e2e": "playwright test -c playwright-ct.config.ts"` in image-editor package.json

32. **Write core flow tests** (~10 tests covering the critical user journeys):
    - **Image load**: URL src â†’ canvas renders â†’ correct dimensions displayed
    - **Crop flow**: select crop tool â†’ adjust preset â†’ apply â†’ image dimensions change
    - **Rotate/flip**: rotate 90Â° â†’ canvas updates â†’ undo restores original
    - **Adjustments**: brightness slider â†’ canvas visually changes â†’ reset restores
    - **Filters**: apply filter â†’ switch to different filter â†’ only latest applied
    - **Shapes**: add rectangle â†’ select it â†’ change color â†’ delete â†’ gone
    - **Text**: add text block â†’ type content â†’ change font size â†’ visible on canvas
    - **Undo/redo chain**: 5 actions â†’ undo 3 â†’ redo 1 â†’ state correct
    - **Export**: full flow â†’ export as PNG â†’ blob has content
    - **Keyboard shortcuts**: zoom +/-, Ctrl+Z undo, Delete removes selection

### 6B. Visual Regression Screenshots (high priority, free with Playwright)

Catch rendering regressions automatically by comparing canvas screenshots:

33. **Add screenshot assertions to flow tests**
    - Baseline snapshots stored in `packages/image-editor/tests/snapshots/`
    - Key checkpoints: after image load, after crop apply, after filter apply, after adjustment
    - Catches: broken filters, wrong colors, layout shifts, missing UI elements
    - Update baselines with `--update-snapshots` when intentional changes are made

### 6C. Engine integration tests (medium priority)

34. **Add integration tests for engine command chains**
    - Test engine + BlockAPI + HistoryManager as a stack (no mocks)
    - Verify complex sequences: create block â†’ set properties â†’ undo â†’ redo â†’ destroy â†’ undo
    - Verify event ordering across compound operations
    - File: `packages/engine/src/__tests__/integration/` folder
    - These use Vitest (no browser needed) â€” engine is pure logic

### Test Commands Summary

| Command                                                                      | What                              | Where      |
| ---------------------------------------------------------------------------- | --------------------------------- | ---------- |
| `pnpm test`                                                                  | Unit tests (Vitest, all packages) | CI + local |
| `pnpm --filter @editx/image-editor test:e2e`                       | Playwright flow tests             | CI + local |
| `pnpm --filter @editx/image-editor test:e2e -- --update-snapshots` | Update visual baselines           | Local only |

---

## Phase 7: Publish Hygiene

35. **Set alpha versions** â€” update both packages to `0.1.0-alpha.1`:
    - `packages/engine/package.json`
    - `packages/image-editor/package.json`

36. **Add `"files"` field to each package.json** â€” `"files": ["dist"]` to exclude tests, coverage, source from npm tarball

37. **Add root LICENSE** â€” pick MIT or preferred license

38. **Rewrite README.md** â€” remove references to `packages/types`, `packages/renderer`, PixiJS, react-editor. Describe the actual architecture:
    - `packages/engine` â€” core block-based engine (Konva renderer)
    - `packages/image-editor` â€” React image editor component
    - Feature list, quick start, config example

39. **Add `.npmignore` or verify `files` field** â€” ensure coverage/, temp/, docs/ don't ship

---

## Phase 8: Accessibility & Feedback System

**Current state**: Foundational ARIA on shell components (EditorShell, ToolSidebar, MobileToolbar, Spinner). Good keyboard shortcuts. But ~40 icon buttons lack `aria-label`, zero live regions, zero toast/notification system, no focus traps on modals, 10+ user actions complete silently.

### 8A. Sonner toast system (high priority)

40. **Install `sonner` and add `<Toaster />` to `EditorShell`**
    - `pnpm --filter @editx/image-editor add sonner`
    - Place `<Toaster />` inside `EditorShell`, scoped to editor container (not document body)
    - Style with editor theme CSS variables so toasts match the editor's look

41. **Create `useNotifications()` hook** â€” centralized toast API
    - New file: `packages/image-editor/src/hooks/use-notifications.ts`
    - Thin wrapper around `sonner`'s `toast()` with editor-specific defaults
    - Methods: `notify.success(msg)`, `notify.error(msg)`, `notify.info(msg)`

42. **Wire toasts to all silent actions**:
    - Crop applied â†’ `"Image cropped"`
    - Shape added â†’ `"Rectangle added"` (use shape kind)
    - Text added â†’ `"Text added"`
    - Image added/replaced â†’ `"Image added"` / `"Image replaced"`
    - Export success â†’ `"Exported as PNG"` (include format)
    - Export failed â†’ error toast with message (replace current `console.error`)
    - Block deleted â†’ `"Shape deleted"`
    - Block duplicated â†’ `"Duplicated"`
    - File validation fail â†’ error toast (move from inline-only in ImagePanel)

### 8B. ARIA labels on icon buttons (high priority)

43. **Add `aria-label` to all icon-only buttons**:
    - `block-action-bar.tsx` â€” Edit, Replace, Bring Forward, Send Backward, Bring to Front, Send to Back, Duplicate, Delete, Align
    - `topbar.tsx` â€” Undo, Redo (currently only `title=`)
    - `text-edit-toolbar.tsx` â€” Bold, Italic, Underline, Alignment, Color swatch
    - `rotate-panel.tsx` â€” Rotate CW, Rotate CCW, Flip H, Flip V
    - `tool-properties-bar.tsx` â€” Reset, Done buttons

44. **Add `aria-pressed` to toggle buttons**:
    - Flip H/V in rotate panel
    - Bold/Italic/Underline in text-edit-toolbar
    - Any boolean toggle that has an on/off state

45. **Fix CropPanel tab structure**:
    - Add `role="tablist"` to tab container
    - Add `role="tab"`, `aria-selected`, `aria-controls` to each tab button
    - Add `role="tabpanel"`, `id` to each tab content area

46. **Fix ImagePanel drop zone**:
    - Change from `<div onClick>` to `<button>` or add `role="button"` + `tabIndex={0}` + `onKeyDown`
    - Ensure keyboard-accessible file selection

### 8C. Live regions & screen reader announcements (high priority)

47. **Add `aria-live="polite"` region in EditorShell**
    - Hidden (`sr-only`) div that receives status text
    - Announces: tool selection changes, block selection, undo/redo state

48. **Add `aria-busy` to export button** during export

49. **Add `role="group"` + `aria-label` to button groups**:
    - Shapes panel shape grid â†’ `aria-label="Shape types"`
    - Filter panel filter grid â†’ `aria-label="Filter presets"`
    - Text panel text presets â†’ `aria-label="Text presets"`
    - Block action bar â†’ `aria-label="Block actions"`

### 8D. Focus management (medium priority)

50. **Add focus trap to ToolSheet**
    - Use `focus-trap-react` or `@radix-ui/react-focus-scope`
    - ToolSheet already has `aria-modal="true"` but focus can escape

51. **Focus restore on modal/sheet close**
    - Store trigger element ref before open
    - Restore focus to trigger when closed

52. **Route focus to panel content on tool selection**
    - When a tool is selected, move focus to the panel heading or first interactive element
    - Prevents focus from being stranded in the sidebar

### 8E. Contrast & shortcut hints (lower priority)

53. **Audit contrast ratios for muted/disabled states**
    - Ensure WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
    - Fix disabled state `opacity:50` if it drops below threshold

54. **Show keyboard shortcut hints in tooltips consistently**
    - All tool buttons: show shortcut letter (C, R, A, F, S, T, I)
    - Action buttons: show Ctrl+D for duplicate, Delete for delete, etc.

---

## Relevant Files

### Project Rules (Phase 0)

- `CLAUDE.md` â€” NEW, project root
- `.github/copilot-instructions.md` â€” NEW

### Shared UI Components (Phase 3 â€” restructure existing + NEW)

**Restructure existing** (flat â†’ folder-per-component):

- `packages/image-editor/src/components/ui/button/` â† `button.tsx`
- `packages/image-editor/src/components/ui/slider/` â† `slider.tsx`
- `packages/image-editor/src/components/ui/select/` â† `select.tsx`
- `packages/image-editor/src/components/ui/popover/` â† `popover.tsx`
- `packages/image-editor/src/components/ui/dropdown-menu/` â† `dropdown-menu.tsx`
- `packages/image-editor/src/components/ui/separator/` â† `separator.tsx`
- `packages/image-editor/src/components/ui/scroll-area/` â† `scroll-area.tsx`
- `packages/image-editor/src/components/ui/tooltip/` â† `tooltip.tsx`
- `packages/image-editor/src/components/ui/spinner/` â† `spinner.tsx`

**NEW components** (folder-per-component pattern):

- `packages/image-editor/src/components/ui/color-picker/` â€” color pick dialog
- `packages/image-editor/src/components/ui/color-palette/` â€” swatch grid
- `packages/image-editor/src/components/ui/slider-field/` â€” label + slider
- `packages/image-editor/src/components/ui/input-group/` â€” input with adornments
- `packages/image-editor/src/components/ui/section/` â€” content section with header
- `packages/image-editor/src/components/ui/switch-field/` â€” switch + label
- `packages/image-editor/src/components/ui/selection-grid/` â€” selectable item grid

### Image Editor (Phase 2 focus)

- `packages/image-editor/src/image-editor.tsx` â€” 632-line root component, split target
- `packages/image-editor/src/hooks/use-engine.ts` â€” 372-line hook, split target
- `packages/image-editor/src/hooks/use-responsive.ts` â€” DELETE (replaced by Tailwind)
- `packages/image-editor/src/hooks/use-tool-manager.ts` â€” tool state machine
- `packages/image-editor/src/hooks/use-export.ts` â€” wire to dialog
- `packages/image-editor/src/store/image-editor-store.ts` â€” 95 lines, clean (no changes needed)
- `packages/image-editor/src/components/shell/topbar.tsx` â€” wire export dialog
- `packages/image-editor/src/components/shell/tool-sidebar.tsx` â€” DELETE (merged into tool-nav.tsx)
- `packages/image-editor/src/components/shell/mobile-toolbar.tsx` â€” DELETE (merged into tool-nav.tsx)
- `packages/image-editor/src/components/shell/tool-sheet.tsx` â€” DELETE (merged into tool-panel.tsx)

### Engine (Phase 1 + 4 + 6)

- `packages/engine/src/engine.ts` â€” perf log cleanup
- `packages/engine/src/konva/webgl-filter-renderer.ts` â€” perf log cleanup
- `packages/engine/src/konva/konva-node-factory.ts` â€” perf log cleanup
- `packages/engine/src/block/block-api.ts` â€” ~1200 lines, document split plan only
- `packages/engine/package.json` â€” remove pixi.js

### Testing (Phase 6)

- `packages/image-editor/playwright-ct.config.ts` â€” NEW
- `packages/image-editor/tests/fixtures/` â€” NEW (test images)
- `packages/image-editor/tests/snapshots/` â€” NEW (visual baselines)
- `packages/engine/src/__tests__/integration/` â€” NEW (engine integration tests)

### Accessibility & Feedback (Phase 8)

- `packages/image-editor/src/hooks/use-notifications.ts` â€” NEW (Sonner toast wrapper)
- `packages/image-editor/src/components/shell/editor-shell.tsx` â€” add `<Toaster />` + `aria-live` region
- `packages/image-editor/src/components/shell/block-action-bar.tsx` â€” add `aria-label` to all buttons
- `packages/image-editor/src/components/shell/topbar.tsx` â€” add `aria-label` to undo/redo
- `packages/image-editor/src/components/shell/text-edit-toolbar.tsx` â€” add `aria-label` + `aria-pressed`
- `packages/image-editor/src/components/shell/tool-sheet.tsx` â€” add focus trap
- `packages/image-editor/src/components/panels/crop-panel.tsx` â€” fix tab semantics
- `packages/image-editor/src/components/panels/image-panel.tsx` â€” fix drop zone accessibility
- `packages/image-editor/src/hooks/use-export.ts` â€” wire toast on success/error

### Biome (Phase 1)

- `biome.json` â€” NEW, project root
- Root `package.json` â€” add format/lint/check scripts
- `apps/demo/package.json` â€” remove ESLint config/deps

### Publishing (Phase 7)

- Root `package.json`, `tsconfig.json`, `README.md`
- Both `packages/*/package.json` files

---

## Verification

1. `pnpm build` â€” clean build with zero TS errors after tsconfig fix
2. `pnpm test` â€” all unit tests pass after refactoring
3. `pnpm --filter @editx/image-editor test:e2e` â€” all Playwright flow tests pass
4. `pnpm --filter @editx/image-editor dev` â€” demo still works: load image, crop, rotate, adjust, filter, shapes, text, image annotations, export
5. Export dialog â€” verify PNG/JPEG/WEBP all produce correct output
6. Visual regression â€” no unexpected screenshot diffs
7. `npm pack --dry-run` in each package â€” confirm only `dist/` is included
8. Check bundle size â€” pixi.js removal should noticeably reduce install footprint
9. Accessibility â€” test with keyboard-only navigation, verify all icon buttons are announced by screen reader
10. Toasts â€” verify feedback appears for: export, crop apply, shape/text add, delete, duplicate, errors

---

## Decisions

- **Pen/freehand (Feature 9):** deferred to beta
- **Export dialog:** included in alpha (format + quality picker)
- **block-api.ts refactoring:** split into sub-API modules before alpha (keep facade for backward compatibility)
- **react-editor package:** deleted entirely (nothing imports it)
- **console.log approach:** gate ALL perf logs behind `__EX_PERF` flag (don't delete â€” useful for debugging)
- **UI component naming:** follows Scaleflex UI Kit conventions (interaction-based names, folder-per-component structure)
- **Testing strategy:** Playwright CT for real-browser flow tests + visual regression; Vitest for unit + engine integration
- **Accessibility:** Sonner for toast feedback, `aria-label` on all icon buttons, `aria-live` for status announcements, focus traps on modals
- **Publishing target:** npm publish
- **Formatter/Linter:** Biome over Prettier+ESLint â€” faster, single tool for format+lint+import sorting, zero plugin config, native TypeScript/JSX support

---

## Out of Scope (deferred)

- Konva renderer unit tests (critical but large effort â€” separate task)
- XState or formal state machine for tool transitions
- Performance optimization of useAdjustmentsTool RAF batching
- Additional translations / i18n locales
- Full WCAG AA compliance audit (target post-alpha)
- Screen reader testing with NVDA/JAWS (manual, post-alpha)
