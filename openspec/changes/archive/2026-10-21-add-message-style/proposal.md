# Proposal

## Why

The prompt is hard-wired to a single-line Conventional Commit. Repositories use other conventions (gitmoji, plain git style), and some changes deserve a body explaining what changed and why. Users need to choose both, per repository or per user, through the config files added in `add-config-files`.

## What Changes

- New setting `style` with values `conventional` (default, the current behavior), `gitmoji`, `conventional-gitmoji`, `simple` and `auto`. Each fixed style maps to a short instruction in the prompt.
- `auto` detects the style locally from the subjects of the last 20 non-merge commits (no API cost) and falls back to `conventional` when no style covers more than half of them. The detected style is printed.
- New setting `oneLine` (default `true`). With `false` the message is a subject line, a blank line and 2-5 short bullets wrapped at 72 columns.
- Both settings are config keys (`style`, `oneLine`) and flags (`--style <style>`, `--one-line` / `--no-one-line`), following the existing settings precedence.
- Response clean-up: a surrounding markdown code fence is removed, and in one-line mode only the first non-empty line is kept, so a chatty model cannot produce a multi-line commit.

## Capabilities

### New Capabilities

### Modified Capabilities
- `commit-generation`: "Commit message generation" uses the selected style and line mode; new requirements for message style, line mode, style detection and response clean-up.
- `configuration`: "Allowed config keys" accepts `style` and `oneLine`.

## Impact

- Code: `src/ai/prompt.js` (style instructions), new `src/ai/style.js` (styles and detection), new `src/git/log.js` (recent subjects), `src/ai/openai.js` (clean-up), `src/config/schema.js` and `src/config/resolve.js` (new keys), `src/cli.js` (flags, detection).
- Tests for each, README. Prompt stays compact: one short sentence per style. No new dependencies.
