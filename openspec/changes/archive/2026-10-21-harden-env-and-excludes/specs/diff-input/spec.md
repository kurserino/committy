# Spec Delta

## ADDED Requirements

### Requirement: Directory existence check
When a `[dir]` argument is given and that path does not exist, the CLI SHALL print `Error: Directory not found: <dir>` (with `<dir>` as typed) and exit with status 1 without running git or calling the API.

#### Scenario: Non-existent directory
- **WHEN** the user runs `committy ./does-not-exist`
- **THEN** the CLI prints `Error: Directory not found: ./does-not-exist` and exits with status 1

### Requirement: Empty prepared input
After preparing the input, if nothing remains once the `DIFF_U0`/`DIFF_STAT`/`FILENAMES` header is stripped, the CLI SHALL print "No staged changes to commit." and stop without calling the API.

#### Scenario: Only deletions staged in names mode
- **WHEN** the user runs `committy --mode names` and the only staged changes are file deletions
- **THEN** the CLI prints "No staged changes to commit.", the API is not called and no commit is made

## MODIFIED Requirements

### Requirement: Default exclude patterns
The CLI SHALL exclude these patterns by default, at any depth of the repository: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.lock`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `*.min.*`, `*.map`, `*.snap`, `.env*`. The `--no-default-excludes` flag SHALL disable them.

#### Scenario: Lockfile ignored
- **WHEN** only `package-lock.json` changes alongside source files
- **THEN** the lockfile diff is not sent to the model

#### Scenario: Nested lockfile and build output ignored
- **WHEN** `web/package-lock.json` and `packages/app/dist/index.js` change alongside source files
- **THEN** neither is sent to the model

#### Scenario: Defaults disabled
- **WHEN** the user passes `--no-default-excludes`
- **THEN** none of the default patterns are excluded

## REMOVED Requirements

### Requirement: Empty input guard
**Reason**: Its only scenario ("Only excluded files staged") described a case that never reaches the guard: when only excluded files are staged, the staged changes check stops earlier with "No staged changes found.".
**Migration**: Replaced by "Empty prepared input", which keeps the same behavior with a scenario that does reach it.
