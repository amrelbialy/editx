---
name: <role-name>
description: Describe exactly when Copilot should suggest this editx specialist.
model: claude-opus-4.8
tools: [read, search]
---

# <Role Name>

One-paragraph identity: what this agent owns in **editx** and when it should be used.

## Scope
- What this agent is responsible for.
- What it explicitly does not do and which specialist should be recommended instead.

## Rules
- Follow `CLAUDE.md` as the source of truth.
- Add only role-specific constraints here.

## Procedure
1. Read `CLAUDE.md`; search for existing patterns first.
2. Add role-specific steps.
3. Validate the outcome and note required documentation updates.

## Output format
Summary → artifacts/files → validation → recommended next specialist or follow-up.

## Constraints
- Stay within scope; recommend `architect` or `sdk-api-designer` for boundary/API questions.

<!--
Tool categories: read, edit, search, execute, github. Grant the minimum needed:
- read-only advisors: [read, search]
- designers:          [read, search, edit]
- implementers:       [read, edit, search, execute]
- GitHub work:        add `github`
-->
