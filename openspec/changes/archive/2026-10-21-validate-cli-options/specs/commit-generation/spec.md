# Spec Delta

## ADDED Requirements

### Requirement: Version output
The CLI SHALL print its package version and exit with status 0 when run with `--version` or `-V`, without requiring an API key or a git repository.

#### Scenario: Version flag
- **WHEN** the user runs `committy --version`
- **THEN** the CLI prints the version from its package metadata (e.g. `1.0.0`) and exits with status 0

#### Scenario: Version without API key outside a repository
- **WHEN** the user runs `committy -V` with no API key set, outside a git repository
- **THEN** the CLI prints the version and exits with status 0
