# diff-input Specification

## Purpose
Collect the staged changes from git and turn them into a size-bounded text input for the model, scoped to an optional directory and excluding noisy files.

## Requirements

### Requirement: Directory scoping
The CLI SHALL accept an optional `[dir]` argument and restrict all git queries to that path. Absolute paths SHALL be converted to paths relative to the current working directory, and path separators SHALL be normalized to `/` so the pathspec works on Windows, macOS and Linux.

#### Scenario: Scoped to a directory
- **WHEN** the user runs `committy ./src`
- **THEN** only staged changes under `src` are considered

#### Scenario: No directory given
- **WHEN** no `[dir]` argument is passed
- **THEN** the pathspec root is `.`

### Requirement: Default exclude patterns
The CLI SHALL exclude these pathspecs by default: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.lock`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `*.min.*`, `*.map`, `*.snap`, `.env*`. The `--no-default-excludes` flag SHALL disable them.

#### Scenario: Lockfile ignored
- **WHEN** only `package-lock.json` changes alongside source files
- **THEN** the lockfile diff is not sent to the model

#### Scenario: Defaults disabled
- **WHEN** the user passes `--no-default-excludes`
- **THEN** none of the default patterns are excluded

### Requirement: Additional excludes
The CLI SHALL accept `--exclude <pattern...>` with one or more extra git pathspec patterns, appended to the active excludes as `:(exclude)<pattern>`.

#### Scenario: Extra exclude
- **WHEN** the user runs `committy --exclude 'docs/**' '*.md'`
- **THEN** changes matching `docs/**` or `*.md` are not considered

### Requirement: Git invocation
Git SHALL be run without a shell, so directory arguments, exclude patterns and commit messages containing spaces, quotes, `$` or backticks are passed to git verbatim on Windows, macOS and Linux. Large staged diffs (tens of megabytes) SHALL be read without failing. A failing git command SHALL raise an error carrying git's stderr (or stdout when stderr is empty).

#### Scenario: Git error surfaced
- **WHEN** a git command fails (e.g. checking out a ref that does not exist)
- **THEN** the error message contains git's own output

#### Scenario: Special characters passed verbatim
- **WHEN** the generated commit message contains quotes, `$HOME`, backticks, `&` or `|`
- **THEN** the commit is created with exactly that message

### Requirement: Input mode selection
The CLI SHALL accept `--mode` with values `auto` (default), `full`, `unified0`, `stat` and `names`, and SHALL cap the input at `--max-input-chars` characters (default 48000). All diff modes SHALL use `--no-ext-diff` and `--find-renames`.

#### Scenario: Forced stat mode
- **WHEN** the user runs `committy --mode stat`
- **THEN** the model receives a `DIFF_STAT` summary instead of the diff

#### Scenario: Custom size cap
- **WHEN** the user runs `committy --max-input-chars 30000`
- **THEN** the input sent to the model is at most 30000 characters

### Requirement: Diff modes
The `full` mode SHALL send the staged diff with 3 lines of context and the `unified0` mode SHALL send it with 0 lines of context, both truncated to the size cap.

#### Scenario: Unified0 mode
- **WHEN** the user runs `committy --mode unified0`
- **THEN** the model receives the zero-context staged diff

### Requirement: Summary modes
The `stat` mode SHALL send `git diff --cached --stat` prefixed with `DIFF_STAT`, and the `names` mode SHALL send the names of added, copied, modified, renamed or type-changed files prefixed with `FILENAMES`, both truncated to the size cap.

#### Scenario: Names mode
- **WHEN** the user runs `committy --mode names`
- **THEN** the model receives `FILENAMES` followed by one staged file path per line

### Requirement: Automatic fallback in auto mode
In `auto` mode the CLI SHALL use the zero-context diff (prefixed `DIFF_U0`) when it is non-empty and fits the limit; otherwise the `stat` summary when non-empty (truncated to the limit); otherwise the file name list. Git errors in the first two steps SHALL be ignored and cause the next step to be tried.

#### Scenario: Small diff
- **WHEN** the zero-context diff fits within `--max-input-chars`
- **THEN** the model receives `DIFF_U0` followed by the diff

#### Scenario: Large diff
- **WHEN** the zero-context diff exceeds `--max-input-chars`
- **THEN** the model receives the `DIFF_STAT` summary instead

### Requirement: Empty input guard
After preparing the input, if nothing remains once the `DIFF_U0`/`DIFF_STAT`/`FILENAMES` header is stripped, the CLI SHALL print "No staged changes to commit." and stop without calling the API.

#### Scenario: Only excluded files staged
- **WHEN** the prepared input is empty
- **THEN** the API is not called and no commit is made

### Requirement: Mode validation
The CLI SHALL reject a `--mode` value other than `auto`, `full`, `unified0`, `stat` or `names`: it SHALL print an error naming the option, the invalid value and the allowed values, and exit with status 1 without running git or calling the API.

#### Scenario: Invalid mode
- **WHEN** the user runs `committy --mode foo`
- **THEN** the CLI prints an error mentioning `--mode`, `foo` and the allowed values, and exits with status 1

### Requirement: Input size validation
The CLI SHALL accept only a positive integer for `--max-input-chars`. Any other value (non-numeric, zero, negative or fractional) SHALL produce an error naming the option and the invalid value, and exit with status 1 without running git or calling the API.

#### Scenario: Non-numeric size
- **WHEN** the user runs `committy --max-input-chars abc`
- **THEN** the CLI prints an error mentioning `--max-input-chars` and `abc`, and exits with status 1

#### Scenario: Zero size
- **WHEN** the user runs `committy --max-input-chars 0`
- **THEN** the CLI prints an error and exits with status 1 instead of reporting "No staged changes to commit."
