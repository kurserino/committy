# Proposal

## Why

The spec drift check after `token-efficiency` found three divergences in `diff-input`: the "Automatic fallback in auto mode" requirement exceeds 500 characters and fails strict validation, "Empty prepared input" omits the `DIFF_PARTIAL` header, and the code skips the hybrid input when the stat takes more than half of its size cap, which no spec states.

## What Changes

- Shorten "Automatic fallback in auto mode" and move the hybrid input rules into a new requirement "Hybrid input in auto mode".
- Document that the hybrid input is not used when the `stat` summary takes more than half of the hybrid size cap.
- Include `DIFF_PARTIAL` in the headers stripped by "Empty prepared input".
- Add a test for the new stat-size scenario. No code behavior changes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `diff-input`: split the auto-mode fallback requirement, document the stat-size rule, list `DIFF_PARTIAL` in the empty-input check.

## Impact

- `openspec/specs/diff-input/spec.md` (through delta specs) and `test/prepare.test.js`.
