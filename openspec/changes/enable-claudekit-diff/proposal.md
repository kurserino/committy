# Proposal

## Why

The `claudekit-diff` plugin (opens the `/diff` panel at session start) is enabled only in the gitignored `.claude/settings.local.json`, so it applies to one machine. It should be part of the project setup, like `claudekit-core` and `claudekit-openspec`, so every machine that opens committy gets it and the session hook warns when it is not installed.

## What Changes

- Enable `claudekit-diff@claudekit` in the committed `.claude/settings.json` (`enabledPlugins`) and drop it from `.claude/settings.local.json`.
- Add `claudekit-diff@claudekit` to the plugins checked by `.claude/hooks/ensure-claudekit.mjs`, so a session on a machine without it gets the install commands.
- Make the hook's warning describe what is missing without claiming the commit and OpenSpec guards are off when only `claudekit-diff` is missing.
- Mention `claudekit-diff` in the plugin note of `CLAUDE.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is Claude Code tooling only; nothing in `src/` or `bin/` changes, so the change sets `skip_specs: true`.

## Impact

- `.claude/settings.json`, `.claude/settings.local.json` (local, not committed), `.claude/hooks/ensure-claudekit.mjs`, `test/ensure-claudekit.test.js`, `CLAUDE.md`.
- Contributors on other machines get a session-start warning to install `claudekit-diff` until they do.
