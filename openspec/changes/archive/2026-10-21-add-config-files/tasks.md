# Tasks

## 1. Move defaults into the config namespace

- [x] 1.1 Move `src/config.js` to `src/config/defaults.js`, make `DEFAULT_MODEL` the plain `"gpt-5"` (no `COMMITTY_MODEL` read), and update imports in `src/cli.js` and tests; verify `npm test` passes and `test/config.test.js` (renamed to `test/defaults.test.js`) asserts `DEFAULT_MODEL === "gpt-5"` regardless of env

## 2. Repository root

- [x] 2.1 Add `getRepositoryRoot()` to `src/git/status.js` (`git rev-parse --show-toplevel`, argument array, `path.resolve` on the output); verify with a test in `test/git-status.test.js` that it returns the repo root when run from a subdirectory

## 3. Loading and validating config files

- [x] 3.1 Add `src/config/schema.js` with the allowed keys and validators (`model`, `mode`, `maxInputChars`, `exclude`, `defaultExcludes`, `dryRun`); verify unit tests cover each valid type and each invalid value
- [x] 3.2 Add `src/config/load.js`: `loadConfigFile(path)` returns `{}` for a missing file, else the validated object, throwing `Invalid config file <path>: <reason>` for unreadable files, bad JSON, a non-object top level, unknown keys (including `apiKey`/`baseURL`) and invalid values; `loadConfigFiles({ repoRoot, homeDir })` returns `{ project, user }` and reads a shared path once as project; verify with tests over temp dirs (scenarios: No config files, Malformed JSON, Top-level value is not an object, Unknown key, Invalid value, Repository tries to set the endpoint)

## 4. Resolving settings

- [x] 4.1 Add `src/config/resolve.js` with `resolveSettings({ flags, env, project, user })` implementing flag → env → project → user → default for scalars and the accumulated, `:(top,exclude)`-mapped `exclude`; verify unit tests for each precedence scenario in the `configuration` spec plus `defaultExcludes` and `dryRun` overrides

## 5. CLI wiring

- [x] 5.1 In `src/cli.js` remove commander defaults from `--mode` and `--max-input-chars` (show them in help text), add `--no-dry-run` and `--default-excludes`, and resolve settings in `commitAction` after `ensureGitRepository()` using `getRepositoryRoot()`, `os.homedir()` and `process.env.COMMITTY_MODEL`; verify existing CLI tests still pass and `committy --help` lists the new flags and defaults
- [x] 5.2 Add CLI tests over temp repos with an isolated home dir (HOME and USERPROFILE): Project file found from a subdirectory, User file applies in any repository, Project file overrides user file, Flag overrides both files, Unpassed flag does not hide config, Env var overrides files, Model from config file, Dry run from config file, Flag forces the commit, Defaults disabled by config file, Flag re-enables defaults, Excludes from both files and flags accumulate, Config exclude is relative to the repository root, Mode from config file, and an invalid config exiting 1 without calling the generator; verify `npm test` passes
- [x] 5.3 Add a `bin` test that a repository `.committy` with `baseURL` makes the run fail and the stub server receives 0 requests; verify `npm test` passes

## 6. Documentation

- [x] 6.1 Add a "Configuration" section to README (locations, JSON example, keys, precedence, accumulated excludes, why credentials are not allowed) and mention the new flags; verify the documented example parses with `loadConfigFile`

## 7. Verification

- [x] 7.1 Run `npm test` and `openspec validate add-config-files --strict`; manually run the linked `committy --dry-run` in a repo with `.committy` and `~/.committy` and confirm the printed model and mode follow the precedence

## Workflow follow-up

- Archive the change, run the spec-drift check, then the finish-feature flow.
