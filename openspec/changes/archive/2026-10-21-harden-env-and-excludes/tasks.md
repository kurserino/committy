# Tasks

## 1. Environment file location

- [x] 1.1 Add `src/env.js` loading `.env` from the installation directory and import it first in `bin/committy.js`, and verify with a `test/env.test.js` unit test that `loadEnv` reads a given file without overriding existing variables
- [x] 1.2 Add a test helper that runs the entrypoint from an isolated package copy and switch `test/bin.test.js` to it, and verify the existing bin tests still pass
- [x] 1.3 Verify with `test/bin.test.js` cases that a `.env` in the repository (setting `OPENAI_BASE_URL` or a key) is ignored and that the installation `.env` key is used
- [x] 1.4 Update the README and `.env.example` to say the `.env` is read only from committy's folder, and verify the README setup steps match

## 2. Key sent to the API

- [x] 2.1 Add `test/bin.test.js` cases with a local stub that check the `Authorization` header is `Bearer <OPENAI_API_KEY>` alone and `Bearer <COMMITTY_OPENAI_API_KEY>` when both are set

## 3. Directory existence

- [x] 3.1 Check the `[dir]` argument in `commitAction` before running git, and verify with `test/cli.test.js` and `test/bin.test.js` cases that a missing directory prints `Error: Directory not found: <dir>` and exits 1 without git or API calls

## 4. Excludes at any depth

- [x] 4.1 Turn default excludes into `**/` glob pathspecs and keep user `--exclude` patterns as plain pathspecs, and verify with `test/config.test.js`, `test/pathspec.test.js` and a `test/cli.test.js` case that nested lockfiles and `dist/` are excluded while root ones still are
- [x] 4.2 Update the README exclude section to say defaults apply at any depth

## 5. Spec wording

- [x] 5.1 Verify a test covers the reworded "Only deletions staged in names mode" scenario (existing `test/cli.test.js` "stops when the prepared input is empty")

## 6. Integration

- [x] 6.1 Run `npm test` and `openspec validate harden-env-and-excludes --strict` and verify both pass

## Workflow follow-up

- Archive the change, run the spec-drift skill and record the check in `openspec/.last-drift-check`.
