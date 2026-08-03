# Follow-ups

Non-blocking items identified during the BlockStore mutation side-door remediation
(Priority 1 quality-review fix, see [CHANGELOG.md](./CHANGELOG.md)) that are out of scope
for that change but worth revisiting.

## 1. Pre-existing non-undoable `BlockAPI` mutators

Several `BlockAPI` methods bypass the command system and write to the store directly,
so they are **not undoable** — this contradicts the "no supported way to mutate the
store directly" guidance now documented in [README.md](./README.md):

- `BlockAPI.setName` (`src/block/block-api.ts`) — calls `store.setName(...)` directly.
- `setShape` / `setFill` / `appendEffect` as used internally by `duplicateBlock`
  (`src/block/block-api-convenience.ts`).

**Action:** audit these paths and reroute them through `engine.exec(...)` /
dedicated commands so they participate in undo/redo history, consistent with the
rest of the public mutation surface.

## 2. Dead `blockStore` constructor option

`EditxEngine`'s constructor still accepts `opts?.blockStore` (`src/editx-engine.ts`),
typed against `BlockStore`. Since `BlockStore` is no longer a public export, external
TypeScript consumers can neither name nor construct that type, making the option
effectively dead for public use.

**Action:** either remove the option from the public constructor signature, or mark
it `@internal` explicitly (it's likely only used by internal tests/fixtures).

## 3. `block-api.ts` file size

`src/block/block-api.ts` exceeds the repo's 250-line-per-file guideline (pre-existing,
not introduced by the BlockStore remediation — the file only gained the new
`getSnapshot` method during that change).

**Action:** split `BlockAPI` by concern (e.g. extract read/query methods from
mutation methods into a co-located helper), following the existing sub-API file
pattern already used elsewhere in `src/block/`.
