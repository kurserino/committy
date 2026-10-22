# Proposal

## Why

`ponytail@ponytail` is enabled in `.claude/settings.json`, but on this machine it was never installed and nothing said so: `.claude/hooks/ensure-claudekit.mjs` checks only the claudekit plugins. The session hook should warn about every plugin the project relies on.

## What Changes

- Check `ponytail@ponytail` in `.claude/hooks/ensure-claudekit.mjs` alongside the claudekit plugins.
- Build the install commands per marketplace: add `kurserino/claudekit` only when a claudekit plugin is missing and `DietrichGebert/ponytail` only when ponytail is missing.
- Reword the warning from "Missing claudekit plugins" to "Missing project plugins", since it is no longer claudekit only. The file keeps its name.
- Mention in `CLAUDE.md` that the hook also checks ponytail.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Claude Code tooling only, nothing in `src/` or `bin/` changes, so the change sets `skip_specs: true`.

## Impact

- `.claude/hooks/ensure-claudekit.mjs`, `test/ensure-claudekit.test.js`, `CLAUDE.md`.
- Machines without ponytail installed get a session-start warning with the commands to install it.
