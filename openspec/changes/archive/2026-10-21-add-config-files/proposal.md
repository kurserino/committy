# Proposal

## Why

Every committy setting (model, mode, size cap, excludes, dry run) has to be passed as a flag on each run, or as the single `COMMITTY_MODEL` env var. Users want persistent preferences per machine, and repositories want to ship their own settings (e.g. extra excludes for generated code) so everyone working on them gets the same input.

## What Changes

- New JSON config files: `.committy` at the git repository root (project scope) and `~/.committy` (user scope). Both optional.
- Per-setting precedence: CLI flag > env var (`COMMITTY_MODEL`) > project file > user file > built-in default.
- Supported keys: `model`, `mode`, `maxInputChars`, `exclude`, `defaultExcludes`, `dryRun`. `exclude` accumulates across all layers instead of replacing.
- Unknown keys, wrong types, invalid values and malformed JSON are errors naming the file, with exit status 1. In particular the API key and API base URL can never be set from a config file: a cloned repository is untrusted.
- New negating flags `--no-dry-run` and `--default-excludes`, so a flag can always override a boolean set in a config file.
- `--mode` and `--max-input-chars` no longer apply commander defaults; the built-in defaults are applied after config resolution (help text still shows them).

## Capabilities

### New Capabilities
- `configuration`: config file locations, format, allowed keys, validation and precedence between flags, env vars, project file, user file and defaults.

### Modified Capabilities
- `commit-generation`: "Model selection" gains the config layers; "Committing with the generated message" gains `dryRun` from config and `--no-dry-run`.
- `diff-input`: "Default exclude patterns" gains `defaultExcludes` and `--default-excludes`; "Additional excludes" gains config `exclude` lists (accumulated, root-relative); "Input mode selection" gains `mode` and `maxInputChars` from config.

## Impact

- Code: new `src/config/` loader (read, validate, merge); `src/cli.js` resolves options through it after the repository check; `src/config.js` stops folding `COMMITTY_MODEL` into the default; `src/git/status.js` gains a repository-root lookup.
- Tests: new loader tests and CLI tests over temporary repos with an isolated home directory.
- Docs: README section on config files. No new dependencies. Existing flag-only usage behaves the same.
