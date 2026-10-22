## MODIFIED Requirements

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

### Requirement: Empty prepared input
After preparing the input, if nothing remains once the `DIFF_U0`/`DIFF_PARTIAL`/`DIFF_STAT`/`FILENAMES` header is stripped, the CLI SHALL print "No staged changes to commit." and stop without calling the API.

#### Scenario: Only deletions staged in names mode
- **WHEN** the user runs `committy --mode names` and the only staged changes are file deletions
- **THEN** the CLI prints "No staged changes to commit.", the API is not called and no commit is made

## ADDED Requirements

### Requirement: Hybrid input in auto mode
The hybrid input (prefixed `DIFF_PARTIAL`) SHALL be the full `stat` summary followed by the zero-context diff cut per file, at most 12000 characters (or `--max-input-chars` when smaller) with at most 3000 characters per file. It SHALL NOT be used when the `stat` summary takes more than half of that size or when no diff content fits; the `stat` fallback applies instead.

#### Scenario: Stat summary takes more than half of the size
- **WHEN** the zero-context diff exceeds `--max-input-chars` and the stat summary is longer than half of the hybrid size cap
- **THEN** the model receives the `DIFF_STAT` summary instead of a `DIFF_PARTIAL` input
