---
name: spec-drift
description: Compare committy's main OpenSpec specs (openspec/specs/) with the actual code and tests, list every divergence, and let the user choose for each one whether to update the spec, fix the code, remove the requirement or ignore it. Use after an OpenSpec change is archived, when a session starts with code changed since the last check, or when the user asks to check, audit or sync specs against the code.
---

Audit the main specs against the implementation and resolve each divergence with the user. Talk to the user in the language they use.

## 1. Scope

- Read `openspec/.last-drift-check` (a commit hash). If it exists, list what changed since then with `git log --oneline <hash>..HEAD -- src bin` and `git diff --stat <hash> -- src bin test`, and also include uncommitted changes (`git status --short`). Focus on the capabilities those files touch, but still skim the rest.
- If the marker is missing or its commit is gone, audit everything.

## 2. Baseline checks

Run and note failures (they are findings too):
- `openspec validate --specs --strict`
- `npm test`

## 3. Compare

For each capability in `openspec list --specs`, read the spec in full (`openspec show <id> --type spec`) and the code and tests that implement it. Classify every difference into one of:

| Kind | Meaning |
|---|---|
| DRIFT | Spec and code both cover the behavior but disagree (messages, defaults, exit codes, order of checks, limits) |
| NOT IMPLEMENTED | Spec promises behavior the code does not have |
| UNSPECIFIED | Observable behavior in the code (option, message, error path, default) that no spec covers |
| UNTESTED | A scenario with no test exercising it |

Verify each finding against the code before reporting it; quote the spec line and point to `file:line`. Do not report implementation details that do not change observable behavior.

## 4. Report and ask

Show a short table of findings (id, kind, capability, one-line summary). Then use AskUserQuestion, up to 4 findings per call, one question per finding, with these options (adapt wording to the finding, keep the recommended one first and marked "(Recommended)"):

- Update the spec to match the code
- Fix the code to match the spec
- Remove the requirement from the spec
- Ignore for now

For UNTESTED findings offer "Add the missing test" instead of the spec options.

If there are no findings, say so and skip to step 6.

## 5. Apply the decisions

Never edit `openspec/specs/` directly and never change code outside an OpenSpec change:
- Spec updates and removals: create one change (for example `sync-specs-<YYYY-MM-DD>`) with MODIFIED/REMOVED/ADDED deltas, validate it with `--strict`, then archive it.
- Code fixes: create a change per fix (or one grouped change) through the openspec-propose workflow and implement it with openspec-apply-change.
- Missing tests: add them (no change needed, tests do not alter behavior) and run `npm test`.
- Ignored findings: list them in the final summary so they are not lost.

## 6. Record the check

Write the current `git rev-parse HEAD` to `openspec/.last-drift-check` and commit it (following the CLAUDE.md commit rules) together with any spec changes.

## 7. Finish the feature

If this check closes a feature on a branch other than `main`, continue with the finish-feature skill.
