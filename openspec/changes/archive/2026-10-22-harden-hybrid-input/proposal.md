# Proposal

## Why

A review of the token-efficiency work found two defects. The hybrid input can exceed its size limit: when the space left for a file is smaller than the `[truncated]` marker, the cut uses a negative length and keeps almost the whole file (a limit of 1100 produced 9379 characters with 6 changed files). And since the reply now has a token cap, a reply cut off by the cap is committed as if it were complete.

## What Changes

- Leave a file out of the hybrid input when its budget cannot hold the marker, so the limit always holds.
- Fail with an error, without committing, when the API reports that the reply was cut off.

## Capabilities

### New Capabilities

### Modified Capabilities
- `diff-input`: the hybrid input requirement gains a scenario for many files under a small limit.
- `commit-generation`: a cut-off reply is reported as an error.

## Impact

- `src/input/prepare.js`, `src/ai/openai.js`, tests in `test/prepare.test.js` and `test/openai.test.js`.
