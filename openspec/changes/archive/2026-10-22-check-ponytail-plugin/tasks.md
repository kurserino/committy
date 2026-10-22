# Tasks

## 1. Session hook

- [x] 1.1 Add `ponytail@ponytail` to `WANTED` and `ROLE` in `.claude/hooks/ensure-claudekit.mjs`, map each plugin to its marketplace repo (`kurserino/claudekit`, `DietrichGebert/ponytail`), emit one `claude plugin marketplace add <repo> --scope project` per marketplace that has a missing plugin, and change the warning prefix to "Missing project plugins"; verify the existing tests in `test/ensure-claudekit.test.js` pass with `ponytail@ponytail` in `IDS` and the new prefix
- [x] 1.2 Add a test to `test/ensure-claudekit.test.js` where only `ponytail@ponytail` is missing, asserting the warning names only it, includes `marketplace add DietrichGebert/ponytail` and `install ponytail@ponytail`, and does not include `kurserino/claudekit`; verify with `npm test`
- [x] 1.3 Say in the plugin note of `CLAUDE.md` that the session hook also checks `ponytail`, and verify the note matches `WANTED`

## 2. Verification

- [x] 2.1 Run `npm test` and `openspec validate check-ponytail-plugin --strict`; both pass

## Workflow follow-up

- Archive with `/opsx:archive`, run the spec-drift check, then finish-feature for the `chore/claudekit-diff-project` branch.
