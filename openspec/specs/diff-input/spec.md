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
The CLI SHALL exclude these patterns by default, at any depth of the repository: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.lock`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `*.min.*`, `*.map`, `*.snap`, `.env*`. The `--no-default-excludes` flag or `"defaultExcludes": false` in a config file SHALL disable them, and `--default-excludes` SHALL enable them, following the settings precedence (flag, then project file, then user file, then enabled).

#### Scenario: Lockfile ignored
- **WHEN** only `package-lock.json` changes alongside source files
- **THEN** the lockfile diff is not sent to the model

#### Scenario: Nested lockfile and build output ignored
- **WHEN** `web/package-lock.json` and `packages/app/dist/index.js` change alongside source files
- **THEN** neither is sent to the model

#### Scenario: Defaults disabled
- **WHEN** the user passes `--no-default-excludes`
- **THEN** none of the default patterns are excluded

#### Scenario: Defaults disabled by config file
- **WHEN** `<repo>/.committy` sets `"defaultExcludes": false`
- **THEN** none of the default patterns are excluded

#### Scenario: Flag re-enables defaults
- **WHEN** `<repo>/.committy` sets `"defaultExcludes": false` and the user runs `committy --default-excludes`
- **THEN** the default patterns are excluded

### Requirement: Additional excludes
The CLI SHALL accept `--exclude <pattern...>` with one or more extra git pathspec patterns, appended to the active excludes as `:(exclude)<pattern>` (relative to the current directory). Patterns from the `exclude` key of the user and project config files SHALL also be appended, relative to the repository root. Excludes SHALL accumulate: defaults, user file, project file and flags all apply together. A pattern that already starts with `:(` SHALL be passed to git unchanged.

#### Scenario: Extra exclude
- **WHEN** the user runs `committy --exclude 'docs/**' '*.md'`
- **THEN** changes matching `docs/**` or `*.md` are not considered

#### Scenario: Excludes from both files and flags accumulate
- **WHEN** `~/.committy` sets `"exclude": ["*.pdf"]`, `<repo>/.committy` sets `"exclude": ["generated/**"]` and the user runs `committy --exclude 'docs/**'`
- **THEN** changes matching `*.pdf`, `generated/**`, `docs/**` or a default pattern are not considered

#### Scenario: Config exclude is relative to the repository root
- **WHEN** `<repo>/.committy` sets `"exclude": ["generated/**"]` and the user runs `committy` inside `<repo>/src`
- **THEN** changes under `<repo>/generated/` are not considered

### Requirement: Git invocation
Git SHALL be run without a shell, so directory arguments, exclude patterns and commit messages containing spaces, quotes, `$` or backticks are passed to git verbatim on Windows, macOS and Linux. Large staged diffs (tens of megabytes) SHALL be read without failing. A failing git command SHALL raise an error carrying git's stderr (or stdout when stderr is empty).

#### Scenario: Git error surfaced
- **WHEN** a git command fails (e.g. checking out a ref that does not exist)
- **THEN** the error message contains git's own output

#### Scenario: Special characters passed verbatim
- **WHEN** the generated commit message contains quotes, `$HOME`, backticks, `&` or `|`
- **THEN** the commit is created with exactly that message

### Requirement: Input mode selection
The CLI SHALL accept `--mode` with values `auto` (default), `full`, `unified0`, `stat` and `names`, and SHALL cap the input at `--max-input-chars` characters (default 16000). When the flag is not passed, `mode` and `maxInputChars` from the config files SHALL apply, following the settings precedence. All diff modes SHALL use `--no-ext-diff` and `--find-renames`.

#### Scenario: Forced stat mode
- **WHEN** the user runs `committy --mode stat`
- **THEN** the model receives a `DIFF_STAT` summary instead of the diff

#### Scenario: Custom size cap
- **WHEN** the user runs `committy --max-input-chars 30000`
- **THEN** the input sent to the model is at most 30000 characters

#### Scenario: Default size cap
- **WHEN** neither the flag nor a config file sets the size cap and the zero-context diff is 20000 characters
- **THEN** the input sent to the model is at most 16000 characters

#### Scenario: Mode from config file
- **WHEN** `<repo>/.committy` sets `"mode": "names"` and the user runs `committy` without `--mode`
- **THEN** the model receives a `FILENAMES` list instead of the diff

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
In `auto` mode the CLI SHALL use the zero-context diff (prefixed `DIFF_U0`) when it is non-empty and fits the limit; otherwise the hybrid input (see "Hybrid input in auto mode"); otherwise the `stat` summary when non-empty (truncated to the limit); otherwise the file name list. Git errors in the first two steps SHALL be ignored and cause the next step to be tried.

#### Scenario: Small diff
- **WHEN** the zero-context diff fits within `--max-input-chars`
- **THEN** the model receives `DIFF_U0` followed by the diff

#### Scenario: Large diff
- **WHEN** the zero-context diff exceeds `--max-input-chars` and the stat summary leaves room for diff content
- **THEN** the model receives `DIFF_PARTIAL`, the stat summary and the truncated diff, within `--max-input-chars` characters

#### Scenario: Hybrid input stays small
- **WHEN** the zero-context diff is far larger than 12000 characters and `--max-input-chars` is 48000
- **THEN** the `DIFF_PARTIAL` input is at most 12000 characters and no file contributes more than 3000 characters of diff

#### Scenario: One huge file does not hide the others
- **WHEN** one staged file's diff alone exceeds `--max-input-chars` and other staged files have small diffs
- **THEN** the small files' diffs are included in full and the huge file's diff is cut and marked `[truncated]`

#### Scenario: Truncation at a boundary
- **WHEN** a file's diff is cut to fit its budget
- **THEN** it ends at a hunk boundary when at least one whole hunk fits, otherwise at a line boundary, followed by a `[truncated]` marker line

#### Scenario: Stat alone fills the limit
- **WHEN** the stat summary alone does not leave room for any diff content
- **THEN** the model receives the `DIFF_STAT` summary truncated to the limit

#### Scenario: No diff or stat
- **WHEN** the zero-context diff and the stat summary are both empty
- **THEN** the model receives the `FILENAMES` list

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

### Requirement: Directory existence check
When a `[dir]` argument is given and that path does not exist, the CLI SHALL print `Error: Directory not found: <dir>` (with `<dir>` as typed) and exit with status 1 without running git or calling the API.

#### Scenario: Non-existent directory
- **WHEN** the user runs `committy ./does-not-exist`
- **THEN** the CLI prints `Error: Directory not found: ./does-not-exist` and exits with status 1

### Requirement: Empty prepared input
After preparing the input, if nothing remains once the `DIFF_U0`/`DIFF_PARTIAL`/`DIFF_STAT`/`FILENAMES` header is stripped, the CLI SHALL print "No staged changes to commit." and stop without calling the API.

#### Scenario: Only deletions staged in names mode
- **WHEN** the user runs `committy --mode names` and the only staged changes are file deletions
- **THEN** the CLI prints "No staged changes to commit.", the API is not called and no commit is made

### Requirement: Hybrid input in auto mode
The hybrid input (prefixed `DIFF_PARTIAL`) SHALL be the full `stat` summary followed by the zero-context diff cut per file, at most 12000 characters (or `--max-input-chars` when smaller) with at most 3000 characters per file. It SHALL NOT be used when the `stat` summary takes more than half of that size or when no diff content fits; the `stat` fallback applies instead.

#### Scenario: Stat summary takes more than half of the size
- **WHEN** the zero-context diff exceeds `--max-input-chars` and the stat summary is longer than half of the hybrid size cap
- **THEN** the model receives the `DIFF_STAT` summary instead of a `DIFF_PARTIAL` input
