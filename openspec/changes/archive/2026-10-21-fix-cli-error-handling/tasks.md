# Tasks

## 1. Exit status on errors

- [x] 1.1 In `src/cli.js`, set `process.exitCode = 1` in the action's catch block and verify with a `test/cli.test.js` case that API, git and commit failures set exit code 1
- [x] 1.2 Keep "No staged changes found." and "No staged changes to commit." at exit code 0 and verify with `test/cli.test.js` cases that assert `process.exitCode` is not 1
- [x] 1.3 Add a `test/bin.test.js` case where the API rejects a fake key and verify the process exits with status 1

## 2. API key only for commit runs

- [x] 2.1 In `src/ai/openai.js`, replace the import-time check with an exported `ensureApiKey()` and a lazily created client, and verify `test/openai.test.js` still passes with an injected client
- [x] 2.2 Call `ensureApiKey()` first in `commitAction` (via injected deps) and verify with a `test/cli.test.js` case that a missing key runs no git command and sets exit code 1
- [x] 2.3 Verify in `test/bin.test.js` that `committy --help` without the key exits 0 and that `committy` without the key still prints "Missing OPENAI_API_KEY (or COMMITTY_OPENAI_API_KEY)" and exits 1

- [x] 2.4 Resolve the key as `COMMITTY_OPENAI_API_KEY || OPENAI_API_KEY` and verify with `test/openai.test.js` cases for fallback, precedence and both missing
- [x] 2.5 Add a `test/bin.test.js` case where only `OPENAI_API_KEY` is set and verify the run gets past the key check

## 3. Git repository check

- [x] 3.1 Add `ensureGitRepository()` to `src/git/status.js` using `git rev-parse --is-inside-work-tree`, and verify with `test/git-status.test.js` cases for outside a repo, inside `.git` and inside a subdirectory
- [x] 3.2 Call it in `commitAction` after the key check and before staged detection, update the outside-repo case in `test/cli.test.js` to expect "Not a git repository" with exit code 1, and verify no git usage text is printed
- [x] 3.3 Add a `test/bin.test.js` case that runs the entrypoint outside a repo and verify exit status 1 and the clear message

## 4. Docs

- [x] 4.1 Change `.env.example` to `OPENAI_API_KEY=` with commented optional `COMMITTY_OPENAI_API_KEY=` and `COMMITTY_MODEL=`, and verify the README's setup section uses the same variable names
- [x] 4.2 Present `OPENAI_API_KEY` as the default and `COMMITTY_OPENAI_API_KEY` as an optional override in the README, and verify the README setup works with only `OPENAI_API_KEY`

## 5. Integration

- [x] 5.1 Run `npm test` and `openspec validate fix-cli-error-handling --strict` and verify both pass

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, so the main specs absorb the deltas.
