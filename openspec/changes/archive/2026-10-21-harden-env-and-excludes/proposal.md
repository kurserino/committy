# Proposal

## Why

The second spec drift check (2026-10-21) found that committy loads a `.env` file from the directory it runs in, which is the user's target repository. A repository that ships a `.env` can set `OPENAI_BASE_URL` and send the user's API key and staged diff to another server (reproduced with a local stub). The same check found that `committy <dir>` with a non-existent directory reports a clean working tree with exit 0, that the default excludes only match at the repository root (nested lockfiles and build output reach the model), that a scenario in the "Empty input guard" requirement describes a case that never reaches the guard, and that no test checks which API key is actually sent.

## What Changes

- **BREAKING (security):** load `.env` only from committy's installation directory; a `.env` in the current directory is never read.
- Fail with `Error: Directory not found: <dir>` and exit 1 when the `[dir]` argument does not exist.
- Apply the default exclude patterns at any depth (e.g. `web/package-lock.json`, `packages/app/dist/**`).
- Replace the "Empty input guard" requirement with "Empty prepared input" (same behavior), whose scenario describes a case that actually reaches it.
- Add tests that check the `Authorization` header sent to the API for each key variable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `commit-generation`: the API key requirement points to the new environment file requirement; adds the environment file location requirement.
- `diff-input`: default excludes match at any depth; adds a directory existence requirement; replaces "Empty input guard" with "Empty prepared input" to fix its scenario.

## Impact

- Code: `bin/committy.js` and a new `src/env.js` (environment loading), `src/config.js` and `src/git/pathspec.js` (excludes), `src/cli.js` (directory check).
- Tests: `test/bin.test.js` runs the entrypoint from an isolated copy of the package so the developer's own `.env` never leaks into tests; new unit tests for env loading and nested excludes.
- Docs: README (where `.env` is read, excludes at any depth).
- Compatibility: anyone relying on a per-repository `.env` for committy settings must move them to environment variables or to the `.env` in committy's installation directory.
