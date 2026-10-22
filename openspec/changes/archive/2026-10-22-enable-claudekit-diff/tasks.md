# Tasks

## 1. Project settings

- [x] 1.1 Add `"claudekit-diff@claudekit": true` to `enabledPlugins` in `.claude/settings.json` and remove it from `.claude/settings.local.json` (delete the file if nothing else is left); verify with `claude plugin list` that `claudekit-diff` is still enabled for this project

## 2. Session hook

- [x] 2.1 Add `claudekit-diff@claudekit` to `WANTED` in `.claude/hooks/ensure-claudekit.mjs` and reword the warning so it lists the missing plugins without saying the commit and OpenSpec guards are off when only `claudekit-diff` is missing; verify the existing tests in `test/ensure-claudekit.test.js` still pass with the new id in `IDS`
- [x] 2.2 Add a test to `test/ensure-claudekit.test.js` where core and openspec are installed for the project but `claudekit-diff` is not, and assert the warning names only `claudekit-diff@claudekit` and its install command; verify with `npm test`
- [x] 2.3 Mention `claudekit-diff` (opens `/diff` at session start) in the plugin note of `CLAUDE.md` and verify the note matches `.claude/settings.json`

## 3. Verification

- [x] 3.1 Run `npm test` and `openspec validate enable-claudekit-diff --strict`; both pass

## Workflow follow-up

- The claudekit template hook (`templates/hooks/ensure-claudekit.mjs` in kurserino/claudekit) stays unchanged: `claudekit-diff` is optional there, required only in committy.
- Archive with `/opsx:archive`, run the spec-drift check, then finish-feature.
