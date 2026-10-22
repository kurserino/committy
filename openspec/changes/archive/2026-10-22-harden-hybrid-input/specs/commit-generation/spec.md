## ADDED Requirements

### Requirement: Cut-off reply
When the API reports that the reply was cut off by the output token limit (finish reason `length`), the CLI SHALL print `Error: The model reply was cut off` and exit with status 1 without creating a commit.

#### Scenario: Reply cut off
- **WHEN** the API responds with finish reason `length`
- **THEN** the CLI prints "Error: The model reply was cut off", exits with status 1 and no commit is made
