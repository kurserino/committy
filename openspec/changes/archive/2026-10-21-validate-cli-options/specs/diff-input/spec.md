# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Git invocation
Git SHALL be run without a shell, so directory arguments, exclude patterns and commit messages containing spaces, quotes, `$` or backticks are passed to git verbatim on Windows, macOS and Linux. Large staged diffs (tens of megabytes) SHALL be read without failing. A failing git command SHALL raise an error carrying git's stderr (or stdout when stderr is empty).

#### Scenario: Git error surfaced
- **WHEN** a git command fails (e.g. checking out a ref that does not exist)
- **THEN** the error message contains git's own output

#### Scenario: Special characters passed verbatim
- **WHEN** the generated commit message contains quotes, `$HOME`, backticks, `&` or `|`
- **THEN** the commit is created with exactly that message
