## MODIFIED Requirements

### Requirement: Hybrid input in auto mode
The hybrid input (prefixed `DIFF_PARTIAL`) SHALL be the full `stat` summary followed by the zero-context diff cut per file, at most 12000 characters (or `--max-input-chars` when smaller) with at most 3000 characters per file. It SHALL NOT be used when the `stat` summary takes more than half of that size or when no diff content fits; the `stat` fallback applies instead.

#### Scenario: Stat summary takes more than half of the size
- **WHEN** the zero-context diff exceeds `--max-input-chars` and the stat summary is longer than half of the hybrid size cap
- **THEN** the model receives the `DIFF_STAT` summary instead of a `DIFF_PARTIAL` input

#### Scenario: Many files under a small limit
- **WHEN** six files changed, the zero-context diff exceeds `--max-input-chars` and the limit is 1500
- **THEN** the input sent to the model is at most 1500 characters, and files that no longer fit are left out of the diff part
