# Design

## Context

`src/cli.js` reads options straight from commander. Two of them (`--mode`, `--max-input-chars`) carry commander defaults, so the action cannot tell a passed flag from a default. `src/config.js` folds `COMMITTY_MODEL` into `DEFAULT_MODEL` at import time. Git runs via `spawnSync` from the current directory, and `[dir]` and `--exclude` pathspecs are relative to it. The installation `.env` is loaded into `process.env` before the CLI modules are imported, so for this design it is part of the env layer.

## Goals / Non-Goals

**Goals:**
- One pure function that merges layers, so precedence is unit-testable without git or the API.
- Config errors surface as normal `Error: ...` lines with exit 1, through the existing catch in `commitAction`.

**Non-Goals:**
- No `COMMITTY_CONFIG` path override, no `--config` flag, no JS/YAML formats, no `committy init`.
- No search for `.committy` in parent directories beyond the repository root, and no XDG path.
- No new env vars per setting (only the existing `COMMITTY_MODEL`).

## Decisions

**Module layout.** A new `src/config/` folder holds `load.js` (read and validate one file), `resolve.js` (merge layers) and `schema.js` (allowed keys and validators). The existing `src/config.js` constants move to `src/config/defaults.js`, and imports are updated, so there is a single `config` namespace instead of a file and a folder sharing the name. Alternative: keep `src/config.js` and add `src/settings/`. Rejected because two names for one concept is confusing.

**Repository root.** `getRepositoryRoot()` in `src/git/status.js` runs `git rev-parse --show-toplevel` with an argument array, right after `ensureGitRepository()`. The output is normalized with `path.resolve`, because git prints forward slashes on Windows.

**Home directory.** `os.homedir()` handles HOME on POSIX and USERPROFILE on Windows. The loader takes `homeDir` and `repoRoot` as parameters, and tests pass temporary directories (CLI tests set both HOME and USERPROFILE).

**Same file once.** If `path.resolve(repoRoot, ".committy") === path.resolve(homeDir, ".committy")` (a dotfiles repo in `~`), only the project layer is loaded.

**Order of checks.** API key, then directory existence, then git repository, then load config, then staged detection. Config needs the repo root, so it comes after the repository check. An invalid config still fails before any diff is read or the API is called.

**Detecting passed flags.** Remove the commander defaults from `--mode` and `--max-input-chars`. The default values move to the help text (`(default: auto)`), and commander's `choices` and `parsePositiveInt` validation stay. Add `--no-dry-run` and `--default-excludes` as negations. Commander stores both pairs in the same attribute (`dryRun`, `defaultExcludes`), so `undefined` means "not passed" when no default is declared. Using `program.getOptionValueSource()` was considered, but plain `undefined` checks on the parsed options keep `commitAction` callable from tests with a plain object, as it is today.

**Merge rules** (`resolveSettings({ flags, env, project, user })`):
- Scalars (`model`, `mode`, `maxInputChars`, `dryRun`, `defaultExcludes`): first defined value from flag → env (only `model` from `COMMITTY_MODEL`) → project → user → default.
- `exclude`: `[...defaults(if enabled), ...user.exclude.map(top), ...project.exclude.map(top), ...flags.exclude.map(cwd)]`. Config patterns become `:(top,exclude)<p>`, so they are root-relative from any subdirectory. Flag patterns keep the current `:(exclude)<p>`. Anything starting with `:(` passes through unchanged, as `buildPathspec` already does. The mapping happens in the resolver for config patterns. `buildPathspec` keeps mapping plain flag patterns.

**Validation.** It is hand-written, with no schema dependency. Unknown keys are reported by name, and JSON parse errors include `err.message`. Errors are formatted as `Invalid config file <absolute path>: <reason>`. `COMMITTY_MODEL` is no longer merged inside `src/config/defaults.js`; `DEFAULT_MODEL` becomes the plain `"gpt-5"`.

## Risks / Trade-offs

- [A repository's `.committy` can pick an expensive `model` or a large `maxInputChars`] → Accepted (user chose this). The model in use is already printed before generation, and flags or `COMMITTY_MODEL` override it.
- [Strict unknown-key errors break older committy versions reading newer files] → Acceptable for a solo tool. The error names the key, so it is easy to fix.
- [`:(top)` magic on Windows] → It is git-native and independent of the OS. Tests cover it on macOS. Windows stays as the unchecked manual item, as before.

## Migration Plan

No migration. With no config files and the same flags, behavior is unchanged. `COMMITTY_MODEL` keeps working and still beats config files. Rollback is to revert the PR.
