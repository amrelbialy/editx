# Change Log
# Editx — Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.0-alpha.16](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.15...@editx/image-editor@0.1.0-alpha.16) (2026-09-06)

### Features

* add support for static images presets and remove css preview implementation ([f9cd9af](https://github.com/amrelbialy/editx/commit/f9cd9af96af9fbd63eb2c0e63482ff6c9c7b7c1d))
* add text highlight and background controls ([c15b396](https://github.com/amrelbialy/editx/commit/c15b396fcd0050f86f954c87ec4fcbd3ab614152))
* **crop:** add crop for image shapes and add more options ([a9c0266](https://github.com/amrelbialy/editx/commit/a9c026602d96d631f8c0b3e59dce3dfbd4b0ba14))
* **engine,image-editor:** preset gallery, block groups, shapes and text background box ([9fade88](https://github.com/amrelbialy/editx/commit/9fade8802e8e378b854ae351c4536dd3dcd84828))
* expand stroke and shadow color controls ([f19403d](https://github.com/amrelbialy/editx/commit/f19403db85b3286dda90f993132f3096854c3f9c))
* **image-editor:** add rich text style presets ([eff99a9](https://github.com/amrelbialy/editx/commit/eff99a91a23565d3e53f6ebd5a301f0a37ec48a8))
* **image-editor:** add text composition presets ([b3b9193](https://github.com/amrelbialy/editx/commit/b3b9193a76f8fca7d49baff0dbfb47f62466338b))
* **Shapes:** add dimensions to image fill ([d5eb280](https://github.com/amrelbialy/editx/commit/d5eb280e8928bb6ee94e48ea95d01eb34deec66d))
* **shapes:** expand shapes catalogue ([7b6d8e6](https://github.com/amrelbialy/editx/commit/7b6d8e6c1e25dffd2680da415e42b8488de952b5))
* **shapes:** improve shape handling ([f3b7d92](https://github.com/amrelbialy/editx/commit/f3b7d92a39db450324f30257d0414519f8a5cadc))

### Bug Fixes

* build and lint CI ([a5206af](https://github.com/amrelbialy/editx/commit/a5206af8eeb8eb60ad4a373cdd90f07204878d42))
* info icon size in background panel ([4c331ee](https://github.com/amrelbialy/editx/commit/4c331eeb434f798174f4a3b64768947db029f461))
* journey tests CI ([fa44968](https://github.com/amrelbialy/editx/commit/fa4496882103199da84baea204f79de1ba4640ad))
* **shapes:** image fill crop flow ([c9a6601](https://github.com/amrelbialy/editx/commit/c9a660198707a87f9edc9309c1e72a9289136389))
* text caret with line height by using custom caret ([7a8a4ab](https://github.com/amrelbialy/editx/commit/7a8a4ab724619b60702ee9c19e53c5ff67b0c345))

## Unreleased

### Features

* **image-editor:** add categorized text and shape preset galleries with built-in search and replaceable or extensible custom catalogs
* **image-editor:** add rich single-block text preset run styles, UTF-16 range overrides, and character-aware previews
* **image-editor:** add layered text preset compositions with editable shape layers, derived thumbnails, and group contextual controls
* **image-editor:** add solid and linear gradient modes to graphic and text stroke controls
* **image-editor:** add image-filled graphic crop with the existing Crop panel and transformer,
	plus fit, scale, rotate, flip, reset, apply, and cancel controls in the contextual toolbar
* **image-editor:** add image-fill Styles and Replace actions while preserving the current fill
	transform during source replacement

### Changed

* **image-editor:** expose Crop, Cover, Fit, and Tile image-fill modes with mode-specific alignment,
	offset, and scale controls.

### Bug Fixes

* **image-editor:** derive shape preset thumbnails and insertion geometry from authored shape, fill, and stroke semantics

## [0.1.0-alpha.15](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.14...@editx/image-editor@0.1.0-alpha.15) (2026-08-05)

### Bug Fixes

* **image-editor:** scope toast notifications inside editor container ([463f776](https://github.com/amrelbialy/editx/commit/463f7765fdcf80ac72eefae3bc0602c5549ee30e))

## [0.1.0-alpha.14](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.13...@editx/image-editor@0.1.0-alpha.14) (2026-08-05)

**Note:** Version bump only for package @editx/image-editor

## [0.1.0-alpha.13](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.12...@editx/image-editor@0.1.0-alpha.13) (2026-08-05)

### Bug Fixes

* **engine:** remediate rendering interaction defects ([9119875](https://github.com/amrelbialy/editx/commit/9119875d0525b11942d04ecfe6ed2df917a5417f))

## [0.1.0-alpha.12](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.11...@editx/image-editor@0.1.0-alpha.12) (2026-08-04)

### Bug Fixes

* **image-editor:** remediate structural and lifecycle defects ([cd43e80](https://github.com/amrelbialy/editx/commit/cd43e80e6a7976d120482be7b6da46948b554358))

## [0.1.0-alpha.11](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.10...@editx/image-editor@0.1.0-alpha.11) (2026-08-03)

### Bug Fixes

* **engine:** remove public BlockStore mutation side-door ([94a2e01](https://github.com/amrelbialy/editx/commit/94a2e01ec50392ca614066da7ca5184facf8943c)), closes [#silentDepth](https://github.com/amrelbialy/editx/issues/silentDepth)
* **image-editor:** batch tool mutations into single undo steps ([9052485](https://github.com/amrelbialy/editx/commit/9052485e225710c91016edc25a2d231cff35c00b))

## [0.1.0-alpha.10](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.9...@editx/image-editor@0.1.0-alpha.10) (2026-08-02)

### Features

* **playground:** full config coverage, responsive layout, and SDK fixes ([48cfbe1](https://github.com/amrelbialy/editx/commit/48cfbe1cc4131ec5fd0757ce6a3534d08ec98395))

## [0.1.0-alpha.9](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.8...@editx/image-editor@0.1.0-alpha.9) (2026-08-02)

**Note:** Version bump only for package @editx/image-editor

## [0.1.0-alpha.8](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.7...@editx/image-editor@0.1.0-alpha.8) (2026-08-01)

### Bug Fixes

* **image-editor:** coalesce color drags and dock crop panel on small screens ([91df209](https://github.com/amrelbialy/editx/commit/91df2098a180f5fbd5bc948c37416d626c777ced))

## [0.1.0-alpha.7](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.6...@editx/image-editor@0.1.0-alpha.7) (2026-08-01)

### Bug Fixes

* **demo:** improve search engine discoverability ([3e4562b](https://github.com/amrelbialy/editx/commit/3e4562b10c00e28881839ba6446e93b4867a6c46))

## [0.1.0-alpha.6](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.5...@editx/image-editor@0.1.0-alpha.6) (2026-07-31)

### Features

* **image-editor:** <editx-image-editor> Web Component over createImageEditor ([248de2c](https://github.com/amrelbialy/editx/commit/248de2c56f73a0b77ea5fc4cc2a9885d90e83622))
* **image-editor:** framework-agnostic createImageEditor() mount API ([932fa7e](https://github.com/amrelbialy/editx/commit/932fa7edb016021b2db7fc93290aaf3f7d9e03b7))
* **image-editor:** unify responsive editor controls ([abb6d39](https://github.com/amrelbialy/editx/commit/abb6d399564d043347158aea1b201302aef74c96))
* regression harness, test-as-docs recipes, and live demo docs ([25191af](https://github.com/amrelbialy/editx/commit/25191aff71d58b6ff7b1034ade7480d3062a1213))

### Bug Fixes

* **engine:** restore rendered scene content ([5bcdc4e](https://github.com/amrelbialy/editx/commit/5bcdc4e25187eab50868bbda931b630eb4f36776))
* **image-editor:** close block bars when entering crop mode ([e2896b3](https://github.com/amrelbialy/editx/commit/e2896b37b91709679036e2774c23779ece59ed13))
* **image-editor:** improve mobile topbar layout and polish landing ([92d3038](https://github.com/amrelbialy/editx/commit/92d3038f3c8bd715b948070cd7b51337799bed4b))
* **image-editor:** make tool panels scroll in narrow bottom sheet ([bae50bf](https://github.com/amrelbialy/editx/commit/bae50bf08b959a042d5e7d29494147b30b724545))
* issues with export in demos ([0c7ae95](https://github.com/amrelbialy/editx/commit/0c7ae952fcf8bb27c6bf779dd6cb307a07af44ee))
* **select:** prevent page scroll jump and sticky-header break on open ([1ae9c03](https://github.com/amrelbialy/editx/commit/1ae9c03b5e23fb27137488ba6d32ae6103dad4f1))

## [0.1.0-alpha.5](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.4...@editx/image-editor@0.1.0-alpha.5) (2026-04-03)

### Bug Fixes

* **engine:** prevent shared WebGL canvas from causing image swap between blocks ([818b143](https://github.com/amrelbialy/editx/commit/818b14310baf7ce67727f84a123e85f8f0d54d74))

## [0.1.0-alpha.4](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.3...@editx/image-editor@0.1.0-alpha.4) (2026-03-30)

### Bug Fixes

- Fix text editor overlay not respecting block rotation

### Improvements

- Improve text editor overlay with inline editing support

- Show text properties in block properties bar during text editing

## [0.1.0-alpha.3](https://github.com/amrelbialy/editx/compare/@editx/image-editor@0.1.0-alpha.2...@editx/image-editor@0.1.0-alpha.3) (2026-03-30)

**Note:** Version bump only for package @editx/image-editor
