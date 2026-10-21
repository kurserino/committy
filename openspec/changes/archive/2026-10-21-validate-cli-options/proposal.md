# Proposal

## Why

The first spec drift check (2026-10-21) found that the CLI accepts invalid options silently or answers with misleading output: `committy --version` is promised by the `commit-generation` spec but fails with "unknown option", an invalid `--max-input-chars` (`abc`, `0`) reports "No staged changes to commit." with exit 0 even when files are staged, and an invalid `--mode` silently falls back to `auto`. The same check found that the `diff-input` "Git invocation" requirement describes implementation details instead of observable behavior.

## What Changes

- Add `committy --version` (and `-V`), printing the package version without requiring an API key.
- Reject an invalid `--mode` with an error that lists the allowed values, exiting with status 1.
- Reject a `--max-input-chars` that is not a positive integer with an error, exiting with status 1.
- Reword the "Git invocation" requirement as observable behavior (cross-platform argument handling and git errors passed through), with no change to the code.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `commit-generation`: adds a version output requirement.
- `diff-input`: adds validation requirements for `--mode` and `--max-input-chars`, and rewords the "Git invocation" requirement as behavior.

## Impact

- Code: `src/cli.js` (commander option definitions and version).
- Tests: `test/bin.test.js` for the new CLI-level errors and `--version`.
- Compatibility: scripts passing an invalid `--mode` or `--max-input-chars` now fail with exit 1 instead of running with a fallback. This is intended.
