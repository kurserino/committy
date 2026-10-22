# Proposal

## Why

The `ensure-claudekit` session hook counts a plugin as installed when it is installed anywhere on the machine. A plugin installed at project scope for another project hides the warning here, and the commit guard is silently missing. It was reproduced in a second project: no warning, and a commit with a Claude trailer went through.

## What Changes

- Count an install only when it is user scope or its `projectPath` is the current project.
- Read the plugin file from `CLAUDE_CONFIG_DIR` when set, instead of always `~/.claude`.
- Add tests for the hook. Same fix in the claudekit template copy.
- No change to the CLI behavior.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `.claude/hooks/ensure-claudekit.mjs`, a new `test/ensure-claudekit.test.js`, and `templates/hooks/ensure-claudekit.mjs` in claudekit.
