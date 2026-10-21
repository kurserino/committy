# Tasks

## 1. Reject empty messages

- [x] 1.1 In `src/cli.js`, after generation (including the TPM retry), throw `The model returned an empty commit message` when the message is empty; verify CLI tests for "Empty response" (no commit, exit 1) and "Empty response in a dry run", and that `npm test` and `openspec validate reject-empty-message --strict` pass
