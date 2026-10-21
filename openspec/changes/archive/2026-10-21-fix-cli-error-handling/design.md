# Design

## Context

See proposal.md - Why. Today `src/ai/openai.js` checks the API key and builds the OpenAI client at import time, so loading `src/cli.js` (needed even for `--help`) exits when the key is missing. `commitAction` catches every error and only logs it, so the process always ends with status 0. The first git command of a run is `git diff --cached --quiet`; outside a repository git switches to `--no-index` mode and rejects `--cached` with its full usage text.

## Goals / Non-Goals

**Goals:**
- Exit status reflects success or failure of a run.
- Clear messages for a missing key and for running outside a git work tree.
- Keep `commitAction` testable in-process with injected dependencies.

**Non-Goals:**
- Validating `--max-input-chars` or other option values.
- Changing the output text of successful runs.
- Distinct exit codes per error type (one non-zero status is enough for scripts and hooks).

## Decisions

- **Signal failure with `process.exitCode = 1`, not `process.exit(1)`.** `commitAction` keeps catching errors, prints `Error: <message>` and sets `process.exitCode`. This lets stdout/stderr flush and keeps the action callable from tests, which reset `process.exitCode` after each case. Alternative: rethrow and let the entrypoint exit; rejected because commander would print its own unhandled-rejection output.
- **Check the API key at the start of the action.** A new `ensureApiKey()` in `src/ai/openai.js` throws a `Missing OPENAI_API_KEY...` error; `commitAction` calls it first, through the injected deps, so the error reaches the same catch block and exits with 1 before any git work. The OpenAI client is created lazily on first use. Alternative: check only right before the API call; rejected because a user without a key would only learn about it after the git checks, and the spec keeps "exit before any git command".
- **`OPENAI_API_KEY` by default, `COMMITTY_OPENAI_API_KEY` as an override.** The key is resolved as `COMMITTY_OPENAI_API_KEY || OPENAI_API_KEY` in one place, used by both the key check and the client. Docs and the error message lead with the standard variable, so most users need no extra setup; the override lets users give committy its own key (cost tracking, separate rate limits, narrower permissions). Same pattern as `GH_TOKEN` over `GITHUB_TOKEN` in the GitHub CLI. Alternatives: only `OPENAI_API_KEY` (rejected: loses the dedicated-key option and breaks setups using the committy variable); only `COMMITTY_OPENAI_API_KEY` (rejected: forces extra setup on machines that already have the standard variable).
- **Repository check with `git rev-parse --is-inside-work-tree`.** A new `ensureGitRepository()` in `src/git/status.js` runs it via `spawnSync` and throws `Not a git repository. Run committy inside a git work tree.` when the status is non-zero or stdout is not `true` (the `.git` directory case prints `false`). It runs right after the key check, before `hasStagedChanges`. Alternative: map git's `--no-index` error text; rejected as brittle across git versions and locales.

## Risks / Trade-offs

- [Scripts that relied on exit status 0 after failures now fail] → Intended behavior; called out in the proposal's Impact.
- [`process.exitCode` set by in-process tests would fail the test runner] → Tests capture and reset it in `afterEach`.
