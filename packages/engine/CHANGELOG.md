# Change Log
# Editx — Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.0-alpha.12](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.11...@editx/engine@0.1.0-alpha.12) (2026-09-06)

### Features

* add support for static images presets and remove css preview implementation ([f9cd9af](https://github.com/amrelbialy/editx/commit/f9cd9af96af9fbd63eb2c0e63482ff6c9c7b7c1d))
* add text highlight and background controls ([c15b396](https://github.com/amrelbialy/editx/commit/c15b396fcd0050f86f954c87ec4fcbd3ab614152))
* **crop:** add crop for image shapes and add more options ([a9c0266](https://github.com/amrelbialy/editx/commit/a9c026602d96d631f8c0b3e59dce3dfbd4b0ba14))
* **engine,image-editor:** preset gallery, block groups, shapes and text background box ([9fade88](https://github.com/amrelbialy/editx/commit/9fade8802e8e378b854ae351c4536dd3dcd84828))
* expand stroke and shadow color controls ([f19403d](https://github.com/amrelbialy/editx/commit/f19403db85b3286dda90f993132f3096854c3f9c))
* **image-editor:** add text composition presets ([b3b9193](https://github.com/amrelbialy/editx/commit/b3b9193a76f8fca7d49baff0dbfb47f62466338b))
* **shapes:** improve shape handling ([f3b7d92](https://github.com/amrelbialy/editx/commit/f3b7d92a39db450324f30257d0414519f8a5cadc))

### Bug Fixes

* build and lint CI ([240d0f8](https://github.com/amrelbialy/editx/commit/240d0f8ea13f7b5b17b20f946ff6941bc460788a))
* **engine:** enforce group hierarchy invariants ([ff21f92](https://github.com/amrelbialy/editx/commit/ff21f92e2ebe615ca6f4d899302bbc8bd2bc70c6))
* **engine:** preserve text background geometry on resize ([8db8617](https://github.com/amrelbialy/editx/commit/8db861752347f639321b2d5658acfd7312d97b60))
* group scaling ([44bc6d3](https://github.com/amrelbialy/editx/commit/44bc6d3197012b25d81bdf0a78c61f223b8e80dc))
* shape radius and stroke while scaling ([c03e3e2](https://github.com/amrelbialy/editx/commit/c03e3e2b7344eafbd814565eddf0a4a6c6dacd5d))
* **shapes:** image fill crop flow ([c9a6601](https://github.com/amrelbialy/editx/commit/c9a660198707a87f9edc9309c1e72a9289136389))
* text caret with line height by using custom caret ([7a8a4ab](https://github.com/amrelbialy/editx/commit/7a8a4ab724619b60702ee9c19e53c5ff67b0c345))
* z ordering in pages and groups ([d977185](https://github.com/amrelbialy/editx/commit/d9771858acdf6218ae6ff217ff6c922450e2265b))

## Unreleased

### Added

* **engine:** add undoable sibling grouping with transform preservation, nested bounds refitting,
	membership commands, and editor group-context navigation.
* **engine:** export the `ShapeGeometry` descriptor union and add undoable
	`engine.block.setShapeGeometry` replacement for rectangle, ellipse, polygon, star, line, and path
	geometry.
* **engine:** add linear and radial graphic fills plus linear gradient strokes, with exported
	gradient types and property keys.
* **engine:** add rich text fill/stroke gradients, run highlights, curves, auto width, caret and
	selection geometry, and block-level `text-union` or `frame` backgrounds.
* **engine:** add image-filled graphic crop sessions with frame previews, image offsets, scale,
	rotation, flips, explicit commit/cancel, and one-entry undo/redo.
* **engine:** add `updateFillImage` for partial image-fill updates and persist image rotation and
	horizontal or vertical flips.
* **engine:** add `exportBlock` for fixed-frame graphic, text, image, and group exports.
* **engine:** add deep immutable block snapshots through `engine.block.getSnapshot`.
* **engine:** add typed pan and live block-transform callbacks.
* **engine:** emit scene serialization version 2 while retaining version 1 loading compatibility.

### Changed

* **engine:** `hexToColor` now accepts `#RRGGBBAA` input while `colorToHex` output is unchanged.
* **engine:** normalize image-fill alignment, pan, and scale by mode and keep Crop content stable
	while resizing its frame.
* **engine:** make block naming undoable and synchronize z-order changes inside pages and groups.

## [0.1.0-alpha.11](https://github.com/amrelbialy/editx/compare/@editx/engine@0.1.0-alpha.10...@editx/engine@0.1.0-alpha.11) (2026-08-05)

**Note:** Version bump only for package @editx/engine

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
* **engine:** removed the public `EditxEngine.getBlockStore()` method (now internal `_getBlockStore()`, marked `@internal`).

### Added

* **engine:** `engine.block.getSnapshot(id: number): ReadonlyBlockData | null` — returns a deep-cloned, read-only projection of a block's full data.
* **engine:** new public types `ReadonlyBlockData` and `DeepReadonly<T>`.

### Migration

* Read block state via the typed getters (`engine.block.getString` / `getFloat` / …) or `engine.block.getSnapshot(id)` instead of reaching into the store.
* Type consumer integrations against `EditxEngine`; `EngineCore` is an internal dependency contract.
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
