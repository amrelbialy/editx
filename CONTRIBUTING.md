# Contributing to Editx

Thanks for your interest in improving Editx! This project is open source under the [MIT license](./LICENSE), and contributions of all kinds — bug reports, docs, features, and fixes — are welcome.

## Ways to contribute

- 🐛 **Report a bug** — open an [issue](https://github.com/amrelbialy/editx/issues) with clear steps to reproduce.
- 💡 **Suggest a feature** — open an issue describing the use case before starting large work, so we can align on direction.
- 📖 **Improve docs** — READMEs, code comments, and the docs site all count.
- 🔧 **Fix or build** — grab an open issue (or file one), then send a pull request.

## Project layout

This is a pnpm + Turborepo monorepo with two publishable packages and one demo app:

```
packages/engine        → @editx/engine — framework-agnostic core (pure TypeScript, no React)
packages/image-editor  → @editx/image-editor — editor UI (React 19, bundled)
apps/demo              → Vite demo site & documentation
```

`image-editor` depends on `engine` via `workspace:*`. Keep the dependency direction one-way: **engine must never import from image-editor or the demo.**

## Development setup

**Prerequisites:** Node.js `22.17.0` (see `.nvmrc`) and [pnpm](https://pnpm.io) `10.23.0` (see `packageManager` in the root `package.json`).

```bash
# 1. Fork & clone the repo, then install dependencies
pnpm install

# 2. Start all packages in watch mode
pnpm dev

# 3. Run the demo app to try changes end-to-end
pnpm --filter demo dev
```

### Common commands

```bash
pnpm build          # Build all packages (tsc via Turborepo)
pnpm test           # Run unit + integration tests (Vitest)
pnpm test:coverage  # Run tests with coverage (engine has a coverage gate)
pnpm check          # Format + lint + import sorting in one pass (Biome)
pnpm format         # Format only
pnpm lint           # Lint only
```

Per-package:

```bash
pnpm --filter @editx/engine test
pnpm --filter @editx/image-editor test
pnpm --filter @editx/image-editor test:e2e   # Playwright component tests
```

## Coding conventions

These are enforced in review (and most are checked by Biome/CI). See [CLAUDE.md](./CLAUDE.md) for the full rules.

- **TypeScript strict** — no `any` at public API boundaries.
- **Biome** for formatting, linting, and import sorting — run `pnpm check` before every commit.
- **Max 250 lines per file** — split by concern before adding more code.
- **One React component per file**; one concern per hook (compose via aggregator hooks).
- **All document mutations go through the engine command system** so they stay undoable — never mutate engine state directly.
- **Design system first** — use the primitives in `packages/image-editor/src/components/ui/` (`Button`, `IconButton`, `Input`, `ColorSwatch`, `SegmentedControl`, …) instead of raw elements. `ui/` stays pure (no `i18n/`, `engine`, or `config/` imports).
- **Responsive via CSS Container Queries** (`@container/editor` + `@3xl/editor:`) — never viewport breakpoints or JS detection.
- **No `console.log`** in production code — gate perf instrumentation behind the `__EX_PERF` flag.

## Testing

- Tests use **Vitest** with **happy-dom**, co-located as `*.test.ts` / `*.test.tsx`.
- UI/visual behavior is covered by **Playwright** component tests in `packages/image-editor`.
- Add or update tests for any behavior you change, and run the narrowest suite that covers it before pushing.
- CI must be green: it runs Biome (`biome ci .`), `pnpm build`, `pnpm test:coverage`, and the Playwright component tests.

## Commit & pull request flow

1. Create a branch off `main` (e.g. `fix/crop-panel-overflow`).
2. Keep commits focused and use **[Conventional Commits](https://www.conventionalcommits.org/)** with a scope, matching the existing history:
   - `feat(image-editor): add arrow shape`
   - `fix(engine): correct crop bounds on flip`
   - `docs(readme): clarify CSS setup`
   - Scopes in use include `engine`, `image-editor`, `demo`, `readme`, `copilot`.
3. Before opening a PR, make sure `pnpm check`, `pnpm build`, and the relevant tests pass locally.
4. Open a PR against `main` with a clear description of **what** changed and **why**. Link any related issue.
5. Address review feedback; keep the branch up to date with `main`.

Releases and version bumps for the `@editx/*` packages are handled by the maintainers — you don't need to bump versions in your PR.

## Code of conduct

Be respectful, constructive, and welcoming. Harassment or discrimination of any kind is not tolerated. Report concerns via a GitHub issue or by contacting the maintainer.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
