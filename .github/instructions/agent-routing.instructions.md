---
description: Enforce specialist routing after an engineering-lead plan is approved
---

# Specialist routing gate

When the engineering-lead returns an ordered plan with named specialist owners:

1. Treat each available named specialist as a required execution gate, not optional advice.
2. If the user approves the plan "as-is" or asks to proceed, preserve both its scope and its
   specialist sequence.
3. Record the specialist steps and dependencies before implementation. Invoke each gate in
   order and wait for its result before starting dependent work.
4. Do not replace a named specialist with direct main-agent work merely because the task looks
   straightforward or faster.
5. If a recommended specialist is unavailable, tell the user which gate cannot run and obtain
   approval before substituting another owner or doing the work directly.
6. Before declaring completion, verify that every approved specialist gate ran. Distinguish
   implementation validation from independent specialist approval.

Example:

- Wrong: engineering-lead recommends `sdk-api-designer -> architect -> developer -> qa ->
  code-reviewer`; the main agent implements directly because the wiring appears simple.
- Correct: invoke `sdk-api-designer` and `architect` first, hand approved decisions to
  `developer`, then run `qa` and `code-reviewer` before reporting completion.

Use the smallest specialist set approved by the user; do not add overlapping agents that the
engineering-lead marked optional or conditional.
