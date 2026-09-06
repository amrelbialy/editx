# editx Copilot Agents

Specialized [GitHub Copilot custom agents](https://docs.github.com/copilot) for the editx
monorepo. Every `*.agent.md` file in `.github/agents/` is a real agent and is auto-discovered
by GitHub.com, Copilot CLI, and supported IDEs. The reusable template lives in
`.github/agent-templates/`. Each agent has a scoped system prompt, a restricted toolset, and
is anchored to [`CLAUDE.md`](../../CLAUDE.md).

## Design philosophy

- **Small, non-overlapping charters.** A tight set that gets used beats many that don't.
- **One implementation owner by default.** Specialists gate only decisions or risks they uniquely
  own; routine tests and validation stay with the implementer.
- **Least-privilege tools.** Reviewers are read-only; only implementers write and run commands.
- **One source of truth.** All agents defer to `CLAUDE.md`.
- **Not LangGraph.** These are dev-assist specialists the user selects with built-in repo
  access; they do not automatically invoke one another. Reach for a framework like
  LangGraph only if a multi-agent system becomes a *shipped, headless* product (e.g. an
  unattended CI bot), not for helping develop this repo.

## Frontmatter format

```yaml
---
name: <kebab-name>            # optional; defaults to filename
description: <when to use>    # required — helps Copilot suggest the right agent
model: claude-opus-4.8        # optional; omit to inherit the active picker model
tools: [read, edit, search, execute, github]   # subset per role (least privilege)
---
<system prompt body>
```

Decision-heavy agents (`engineering-lead`, `architect`, `sdk-api-designer`, and
`rendering-engineer`) pin `claude-opus-4.8`. Routine implementation, QA, review, and
documentation agents inherit the active picker model so teams can choose a lower-latency option.
Tool categories: `read`, `edit`, `search`, `execute`, `github`.

## Roster

### Tier 1 — active

| Agent | File | Tools | Use when |
|-------|------|-------|----------|
| Engineering Lead | `engineering-lead.agent.md` | read, search, github | Unclear ownership, cross-package work, public API changes, or high-risk requests |
| Architect | `architect.agent.md` | read, search, edit | Module boundaries, placement, new subsystem design, cross-package refactors |
| SDK / API Designer | `sdk-api-designer.agent.md` | read, search, edit | Engine public API: new commands, EventAPI, exported types |
| Rendering Engineer | `rendering-engineer.agent.md` | read, edit, search, execute | Konva/canvas, hit-testing, transforms, on-canvas performance |
| Developer | `developer.agent.md` | read, edit, search, execute | Implement features / fix bugs across packages |
| Documentation Writer | `documentation-writer.agent.md` | read, edit, search, execute | Public API references, guides, examples, and README content |
| Code Reviewer | `code-reviewer.agent.md` | read, search | Review high-risk or final PR diffs (read-only) |
| QA | `qa.agent.md` | read, edit, search, execute | Independent complex/regression/interaction test coverage |

### Tier 2 — planned (add once Tier 1 is proven)

- **performance-engineer** — `__EX_PERF` profiling, render/interaction budgets, bundle size.
- **security-engineer** — dependency/supply-chain, input handling, safe serialization.

### Tier 3 — process roles (thin as coding agents; start folded into Engineering Lead)

- **product-manager** — scope/prioritization framing.
- **release-manager** — versioning, changelog, publish flow for `@editx/*`.
- **open-source-maintainer** — issue triage, contribution guidelines, PR shepherding.

> These three are largely workflow/orchestration rather than autonomous coding. Keep them as
> lightweight prompts (or Engineering Lead responsibilities) until there's a concrete, repeated
> need for a dedicated agent.

## Risk-based routing

Agents do not invoke one another automatically. Prefer the shortest route that resolves the
actual decisions and risk:

```text
FAST:      developer -> targeted test -> pnpm check:ci (once, final)
BOUNDARY:  architect -> developer
PUBLIC API: sdk-api-designer -> developer -> documentation-writer
RENDERING: rendering-engineer
HIGH RISK: implementation owner -> qa and/or code-reviewer
```

Skip `engineering-lead` for concrete package-local work. Use it when ownership is unclear, work
crosses packages, public API design is involved, or risk needs an explicit verification plan. Its
plan classifies work as `FAST`, `GATED`, or `HIGH_RISK` and labels specialist steps `required` or
`advisory`.

The implementation owner writes focused tests and iterates without repository-wide linting. The
last role that modifies files runs `pnpm check:ci` once after all edits and focused tests. QA and
review consume that result unless they modify files. Add `qa` only when independent test strategy
or high-risk coverage adds information, and add `code-reviewer` for high-risk or final PR review
rather than every local iteration.

## Adding a new agent

1. `cp .github/agent-templates/_template.md .github/agents/<role>.agent.md`
2. Pin `model: claude-opus-4.8` only for decision-heavy specialists. Otherwise inherit the
  active picker model. Fill in `description` and grant the **minimum** `tools`.
3. Write the system prompt: Scope → Rules → Procedure → Output format → Constraints.
4. Reference `CLAUDE.md` rules rather than restating them in full.
5. Keep it focused — if two agents would overlap, merge them or sharpen their descriptions.

## Shared conventions

`CLAUDE.md` is the source of truth. Agent prompts repeat only the constraints needed for
their specialist decisions; shared project rules should not be copied into every agent.
