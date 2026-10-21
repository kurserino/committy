# Proposal

## Why

Committy's failure paths are unfriendly and invisible to automation: errors exit with status 0 (so scripts and git hooks treat a failed run as success), running outside a git repository prints git's full `--no-index` usage dump instead of a clear message, `committy --help` refuses to run without an API key, and `.env.example` documents the wrong variable name.

## What Changes

- Any error during a run (git failure, API failure, failed commit) makes the CLI exit with a non-zero status. Informational outcomes ("No staged changes found", "No staged changes to commit") keep exiting with 0.
- Before touching the index, the CLI checks that it runs inside a git work tree and, if not, prints a clear "Not a git repository" error and exits with status 1.
- The API key is only required when a commit message is actually being generated: `--help` and `--version` work without it. A run without the key still exits with status 1 before doing any git work.
- The API key is read from the standard `OPENAI_API_KEY`, so machines that already export it work without extra setup. `COMMITTY_OPENAI_API_KEY` remains as an optional override that gives committy its own key.
- `.env.example` and the README present `OPENAI_API_KEY` as the default and `COMMITTY_OPENAI_API_KEY` (plus `COMMITTY_MODEL`) as optional.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `commit-generation`: the API key is read from `OPENAI_API_KEY` with `COMMITTY_OPENAI_API_KEY` as an optional override, and no longer blocks `--help`; error reporting now requires a non-zero exit status.
- `staged-changes-check`: adds a git repository check that runs before staged changes detection.

## Impact

- Code: `src/cli.js` (action flow and exit status), `src/ai/openai.js` (key check and client creation move from import time to call time), `src/git/` (new repository check).
- Tests: `test/cli.test.js`, `test/bin.test.js`, `test/git-run.test.js`, `test/git-status.test.js` (assertions that pinned the old behavior).
- Docs: `.env.example`, README if it mentions the key requirement.
- Compatibility: scripts that relied on committy always exiting 0 will now see status 1 on failures. This is the intended fix.
