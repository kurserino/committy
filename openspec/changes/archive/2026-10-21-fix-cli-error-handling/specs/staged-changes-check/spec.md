# Spec Delta

## ADDED Requirements

### Requirement: Git repository check
Before detecting staged changes, the CLI SHALL verify that the current directory is inside a git work tree. If it is not, the CLI SHALL print `Error: Not a git repository. Run committy inside a git work tree.` and exit with status 1 without printing git's own usage output.

#### Scenario: Outside a git repository
- **WHEN** the user runs `committy` in a directory that is not inside a git repository
- **THEN** the CLI prints the "Not a git repository" error and exits with status 1

#### Scenario: Inside the .git directory
- **WHEN** the user runs `committy` from inside a repository's `.git` directory
- **THEN** the CLI prints the "Not a git repository" error and exits with status 1

#### Scenario: Inside a subdirectory of a repository
- **WHEN** the user runs `committy` from a subdirectory of a git work tree
- **THEN** the check passes and the run continues to staged changes detection
