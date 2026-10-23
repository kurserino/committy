# Proposal

## Why

`claudekit-diff` 1.1 no longer opens `/diff` at session start: it opens it once per session, as soon as the terminal is wide enough to dock the panel. `CLAUDE.md` and the session hook's warning still say "at session start".

## What Changes

- `CLAUDE.md`: describe `claudekit-diff` as opening the `/diff` panel once per session, when the terminal is wide enough.
- `.claude/hooks/ensure-claudekit.mjs`: the role shown when `claudekit-diff` is missing becomes "/diff panel", the same wording the claudekit setup generates.
- `test/ensure-claudekit.test.js`: expect the new wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Docs and Claude Code tooling only, so the change sets `skip_specs: true`.

## Impact

`CLAUDE.md`, `.claude/hooks/ensure-claudekit.mjs`, `test/ensure-claudekit.test.js`.
