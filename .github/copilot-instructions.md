# Copilot Instructions

See [CLAUDE.md](../CLAUDE.md) at project root for full project rules, architecture, and conventions.

## Critical Rules (repeated for quick reference)

- **Max 250 lines per file**. Split by concern before adding more code.
- **Biome** for formatting and linting. Run `pnpm check` before committing.
- **Tailwind-first responsive**: Use CSS Container Queries (`@container/editor` + `@3xl/editor:`) — never viewport breakpoints or JS detection.
- **Command system**: All document mutations go through the engine command system (undoable). Never mutate engine state directly.
- **Hook ordering**: refs → custom hooks → useState → useMemo/useCallback → useEffect (blank line between groups).
- **No `console.log`** in production code — gate behind `__EX_PERF` flag.
- **Design system**: Use `ui/` primitives, never raw elements — `Button`/`IconButton` (no native `title`), `Input` (type prop, no `NumberField`), `ColorSwatch`, `SegmentedControl`. Compose shared tokens from `ui/styles.ts` (`focusRing`, `controlBase`, `interactiveBase`) — never inline focus-ring strings. `ui/` stays pure (no `i18n/`/`engine`/`config/` imports). Spacing: control `h-8`/`px-2`, panel `p-3`, section `gap-3`, row `gap-2`, inline `gap-1.5`, label col `w-12`.
