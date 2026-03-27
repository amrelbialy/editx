# Copilot Instructions

See [CLAUDE.md](../../CLAUDE.md) at project root for full project rules, architecture, and conventions.

## Critical Rules (repeated for quick reference)

- **Max 250 lines per file**. Split by concern before adding more code.
- **Biome** for formatting and linting. Run `pnpm check` before committing.
- **Tailwind-first responsive**: Use CSS Container Queries (`@container/editor` + `@3xl/editor:`) — never viewport breakpoints or JS detection.
- **Command system**: All document mutations go through the engine command system (undoable). Never mutate engine state directly.
- **Hook ordering**: refs → custom hooks → useState → useMemo/useCallback → useEffect (blank line between groups).
- **No `console.log`** in production code — gate behind `__EX_PERF` flag.
