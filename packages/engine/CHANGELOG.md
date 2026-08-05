# Change Log
# Editx — Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.0-alpha.10](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.9...@editx/engine@0.1.0-alpha.10) (2026-08-05)

### Bug Fixes

* **engine:** keep crop children anchored and refine crop/zoom rendering ([88e76bb](https://github.com/amrelbialy/editx/commit/88e76bb4deabf3c44138ef40db5520eca9a20a67))
* **engine:** remediate rendering interaction defects ([9119875](https://github.com/amrelbialy/editx/commit/9119875d0525b11942d04ecfe6ed2df917a5417f))

## [0.1.0-alpha.9](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.8...@editx/engine@0.1.0-alpha.9) (2026-08-03)

### Bug Fixes

* **engine:** reconcile Konva WebGL/CPU filter pipeline parity ([2b7e174](https://github.com/amrelbialy/editx/commit/2b7e1746a8731dd0bff4fdac21c5e37090e2eb74))
* **engine:** remove public BlockStore mutation side-door ([94a2e01](https://github.com/amrelbialy/editx/commit/94a2e01ec50392ca614066da7ca5184facf8943c)), closes [#silentDepth](https://github.com/amrelbialy/editx/issues/silentDepth)

## [0.1.0-alpha.9](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.8...@editx/engine@0.1.0-alpha.9) (2026-08-03)

### ⚠ BREAKING CHANGES

* **engine:** the public `BlockStore` mutation side-door has been closed. Direct store access is no longer part of the supported public API.

### Removed

* **engine:** removed the public `BlockStore` runtime export. There is no supported way to mutate the store directly.
* **engine:** removed the `EngineCore` type from public type exports.
* **engine:** removed the public `EditxEngine.getBlockStore()` method (now internal `_getBlockStore()`, marked `@internal`).

### Added

* **engine:** `engine.block.getSnapshot(id: number): ReadonlyBlockData | null` — returns a deep-cloned, read-only projection of a block's full data.
* **engine:** new public types `ReadonlyBlockData` and `DeepReadonly<T>`.

### Migration

* Read block state via the typed getters (`engine.block.getString` / `getFloat` / …) or `engine.block.getSnapshot(id)` instead of reaching into the store.
* Type against `EditxEngine` instead of the removed `EngineCore` interface.
* All mutation must go through commands — `engine.exec(...)` or `engine.block.set*` — which are undoable and emit lifecycle events. Do not hold or mutate a direct store reference.

### Bug Fixes

* **engine:** the Konva `onAutoSize` auto text-height reflow now routes through the command system (wrapped in `beginSilent()`/`endSilent()` so it does not create a spurious undo step) instead of mutating the store directly. This closes a non-undoable side-door and fixes a latent infinite-loop edge case in the height-clamp path. Auto-height changes now emit `block:stateChanged` / lifecycle "updated" events, which previously did not fire.

## [0.1.0-alpha.8](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.7...@editx/engine@0.1.0-alpha.8) (2026-08-02)

**Note:** Version bump only for package @editx/engine

## [0.1.0-alpha.7](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.6...@editx/engine@0.1.0-alpha.7) (2026-08-01)

### Bug Fixes

* **demo:** improve search engine discoverability ([3e4562b](https://github.com/amrelbialy/editx/commit/3e4562b10c00e28881839ba6446e93b4867a6c46))

## [0.1.0-alpha.6](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.5...@editx/engine@0.1.0-alpha.6) (2026-07-31)

### Features

* regression harness, test-as-docs recipes, and live demo docs ([25191af](https://github.com/amrelbialy/editx/commit/25191aff71d58b6ff7b1034ade7480d3062a1213))

### Bug Fixes

* **engine:** require Ctrl/Cmd for wheel zoom in canvas ([a06ba18](https://github.com/amrelbialy/editx/commit/a06ba1852e1f398c5375086b19e2f5169f7ac794))
* **engine:** restore rendered scene content ([5bcdc4e](https://github.com/amrelbialy/editx/commit/5bcdc4e25187eab50868bbda931b630eb4f36776))
* **image-editor:** improve mobile topbar layout and polish landing ([92d3038](https://github.com/amrelbialy/editx/commit/92d3038f3c8bd715b948070cd7b51337799bed4b))

## [0.1.0-alpha.5](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.4...@editx/engine@0.1.0-alpha.5) (2026-04-03)

### Bug Fixes

* **engine:** prevent shared WebGL canvas from causing image swap between blocks ([818b143](https://github.com/amrelbialy/editx/commit/818b14310baf7ce67727f84a123e85f8f0d54d74))

## [0.1.0-alpha.4](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.3...@editx/engine@0.1.0-alpha.4) (2026-03-30)

### Bug Fixes

- Fix block hover outline showing while dragging

- Fix text editing not respecting block rotation

### Improvements

- Add text editor session APIs and block property helpers

- Improve Konva text rendering pipeline

- Add event bus support for text editing lifecycle

- Improve formatted text rendering and node factory handling

- Improve Konva renderer adapter for text blocks

- Add transformer style support for text blocks

## [0.1.0-alpha.3](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.2...@editx/engine@0.1.0-alpha.3) (2026-03-30)

**Note:** Version bump only for package @editx/engine
