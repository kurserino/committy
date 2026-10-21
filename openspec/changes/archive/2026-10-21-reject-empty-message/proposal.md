# Proposal

## Why

Found by the spec-drift check after `add-message-style`: when the model returns an empty answer (or an empty code fence), the cleaned message is empty. A normal run then fails with an unhelpful "git commit failed", and a dry run prints an empty message and exits 0.

## What Changes

- An empty message after clean-up is an error: `Error: The model returned an empty commit message`, exit status 1, and `git commit` is not run. The same applies to dry runs.

## Capabilities

### New Capabilities

### Modified Capabilities
- `commit-generation`: new requirement "Empty generated message".

## Impact

- Code: `src/cli.js` only. Tests in `test/cli.test.js`. No new dependencies.
