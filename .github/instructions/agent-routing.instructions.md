---
description: Route editx work by risk while preserving required specialist decisions
---

# Risk-based specialist routing

Use one implementation owner by default. Skip `engineering-lead` for a concrete, package-local
change with a named file, symbol, failing behavior, or test unless an unresolved boundary or
public API decision appears during implementation.

## Route classes

- **FAST** — one implementation owner completes the change, focused tests, and routine
  validation. This is the default for local features, fixes, and refactors.
- **GATED** — an unresolved architecture, public API, compatibility, or rendering decision must
  be settled by the named specialist before implementation continues.
- **HIGH_RISK** — the implementation owner completes the work, then independent QA or review is
  required because the blast radius or behavior warrants it.

When `engineering-lead` returns a plan, every specialist step must be labeled `required` or
`advisory`:

1. Preserve the order of `required` decision gates and wait for their results before dependent
   implementation.
2. Treat `advisory` steps as optional input, not blockers. Do not invoke them when the
   implementation owner can resolve the task within established patterns.
3. Let the implementation owner add focused tests and run routine validation. Do not add a QA
   handoff that only repeats those checks.
4. Require `qa` for independent test strategy, complex regressions, or high-risk interaction
   coverage. Require `code-reviewer` for high-risk or final PR review, not every local iteration.
5. Run independent read-only checks in parallel when tooling supports it.
6. Do not add a handoff when the next role would repeat investigation, tests, or validation that
   already produced a clear result.
7. The last role that modifies files runs repository-wide Biome validation once, after all edits
   and focused tests: `pnpm check:ci`. Do not run it during intermediate iterations, and do not
   rerun it in QA or review unless that role modifies files. If it fails, fix the reported issues
   and rerun it as the final check.

Use this compact handoff between roles:

```text
Decision:
Affected files:
Invariants:
Required checks:
Unresolved:
```

Before completion, verify required gates, focused tests, and the final Biome check ran. Advisory
steps need not run and should not delay delivery.
