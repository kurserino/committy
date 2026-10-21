# Spec Delta

## ADDED Requirements

### Requirement: Empty generated message
When the message is empty after clean-up, the CLI SHALL print `Error: The model returned an empty commit message` and exit with status 1 without running `git commit`, also in dry runs.

#### Scenario: Empty response
- **WHEN** the model returns only whitespace or an empty code fence
- **THEN** the CLI prints "Error: The model returned an empty commit message", does not commit and exits with status 1

#### Scenario: Empty response in a dry run
- **WHEN** the user runs `committy --dry-run` and the model returns an empty answer
- **THEN** the CLI prints the same error and exits with status 1
