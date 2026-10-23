# Tasks

## 1. Wording

- [x] 1.1 Change the `claudekit-diff` role in `.claude/hooks/ensure-claudekit.mjs` to "/diff panel" and update the matching assertion in `test/ensure-claudekit.test.js`; verify with `node --test test/ensure-claudekit.test.js`
- [x] 1.2 Reword the `claudekit-diff` sentence in `CLAUDE.md` to "opens the `/diff` panel once per session, as soon as the terminal is wide enough"; verify `grep -n "at session start" CLAUDE.md` only matches the hook's own timing

## 2. Verification

- [x] 2.1 Run `npm test` and `openspec validate fix-diff-wording --strict`; both pass

## Workflow follow-up

- Archive with `/opsx:archive`, run the spec-drift check, then finish-feature.
