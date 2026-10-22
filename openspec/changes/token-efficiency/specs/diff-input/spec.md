## MODIFIED Requirements

### Requirement: Automatic fallback in auto mode
In `auto` mode the CLI SHALL use the zero-context diff (prefixed `DIFF_U0`) when it is non-empty and fits the limit. When it exceeds the limit, the CLI SHALL send a hybrid input (prefixed `DIFF_PARTIAL`) made of the full `stat` summary followed by the zero-context diff truncated per file, within the limit and within 12000 characters, with at most 3000 characters per file. When the hybrid input cannot include any diff content, the CLI SHALL use the `stat` summary when non-empty (truncated to the limit), otherwise the file name list. Git errors in the first two steps SHALL be ignored and cause the next step to be tried.

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
