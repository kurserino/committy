# Proposal

## Why

The Claude Code tooling in `.claude/` (OpenSpec skills, `opsx` commands, hooks) is now maintained as the `claudekit` plugins. Keeping local copies means two sources of truth that drift apart, and projects other than committy cannot share fixes.

## What Changes

- Remove the local copies in `.claude/skills`, `.claude/commands` and the hooks that now live in the plugins (`commit-identity`, `after-archive`, `drift-reminder`, `require-openspec-change`, `lib`).
- Declare the `claudekit` marketplace and the `claudekit-core`, `claudekit-openspec` and `ponytail` plugins in `.claude/settings.json`.
- Add a `SessionStart` hook that tells Claude when a claudekit plugin is not installed, because the commit-identity and OpenSpec guards live in the plugins and would otherwise disappear silently.
- No change to the CLI behavior.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `.claude/settings.json`, `.claude/hooks/ensure-claudekit.mjs` (new) and the removed files under `.claude/`.
- A fresh clone needs the plugins installed (`claude plugin install claudekit-core@claudekit --scope project`, same for `claudekit-openspec`); the new hook reminds when they are missing.
- Specs and `src/` are untouched.
