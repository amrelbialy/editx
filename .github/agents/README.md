# editx Copilot Agents

Specialized [GitHub Copilot CLI custom agents](https://docs.github.com/copilot) for the editx
monorepo. Every `*.md` file in `.github/agents/` is a real agent and is auto-discovered by
Copilot. The reusable template lives in `.github/agent-templates/`. Each agent has a scoped
system prompt, a restricted toolset, and is anchored to [`CLAUDE.md`](../../CLAUDE.md).

## Design philosophy

- **Small, non-overlapping charters.** A tight set that gets used beats many that don't.
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
model: claude-opus-4.8        # required for editx agents
tools: [read, edit, search, execute, github]   # subset per role (least privilege)
---
<system prompt body>
```

All editx agents use `claude-opus-4.8`. Tool categories: `read`, `edit`, `search`,
`execute`, `github`.

## Roster

### Tier 1 — active

| Agent | File | Tools | Use when |
|-------|------|-------|----------|
| Engineering Lead | `engineering-lead.md` | read, search, github | Any multi-step / cross-cutting request — plan and recommend routing first |
| Architect | `architect.md` | read, search, edit | Module boundaries, placement, new subsystem design, cross-package refactors |
| SDK / API Designer | `sdk-api-designer.md` | read, search, edit | Engine public API: new commands, EventAPI, exported types |
| Rendering Engineer | `rendering-engineer.md` | read, edit, search, execute | Konva/canvas, hit-testing, transforms, on-canvas performance |
| Developer | `developer.md` | read, edit, search, execute | Implement features / fix bugs across packages |
| Code Reviewer | `code-reviewer.md` | read, search | Review a diff before it lands (read-only) |
| QA | `qa.md` | read, edit, search, execute | Design & run Vitest / Playwright tests |

### Tier 2 — planned (add once Tier 1 is proven)

- **performance-engineer** — `__EX_PERF` profiling, render/interaction budgets, bundle size.
- **security-engineer** — dependency/supply-chain, input handling, safe serialization.
- **documentation-writer** — public API docs, guides, examples, and README maintenance.

### Tier 3 — process roles (thin as coding agents; start folded into Engineering Lead)

- **product-manager** — scope/prioritization framing.
- **release-manager** — versioning, changelog, publish flow for `@editx/*`.
- **open-source-maintainer** — issue triage, contribution guidelines, PR shepherding.

> These three are largely workflow/orchestration rather than autonomous coding. Keep them as
> lightweight prompts (or Engineering Lead responsibilities) until there's a concrete, repeated
> need for a dedicated agent.

## Recommended manual sequence

Agents do not invoke one another automatically. Use the Engineering Lead's plan to select
the next specialist:

```
engineering-lead ─┬─► architect ─────► sdk-api-designer
                  │                         │
                  ├─► rendering-engineer ◄──┘
                  ├─► developer ──► qa ──► code-reviewer
                  └─► (tier 2) performance / security / docs
```

## Adding a new agent

1. `cp .github/agent-templates/_template.md .github/agents/<role>.md`
2. Keep `model: claude-opus-4.8`, fill in `description` (this helps Copilot suggest
   the agent), and grant the **minimum** `tools`.
3. Write the system prompt: Scope → Rules → Procedure → Output format → Constraints.
4. Reference `CLAUDE.md` rules rather than restating them in full.
5. Keep it focused — if two agents would overlap, merge them or sharpen their descriptions.

## Shared conventions

`CLAUDE.md` is the source of truth. Agent prompts repeat only the constraints needed for
their specialist decisions; shared project rules should not be copied into every agent.
