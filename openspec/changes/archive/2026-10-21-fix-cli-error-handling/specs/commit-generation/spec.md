# Spec Delta

## MODIFIED Requirements

### Requirement: API key configuration
The CLI SHALL read the OpenAI API key from `OPENAI_API_KEY`, unless `COMMITTY_OPENAI_API_KEY` is set, which takes precedence (a local `.env` file is also loaded via dotenv). The key SHALL only be required for a commit run: when it is missing, the run SHALL print an error and exit with status 1 before running any git command. Help and version output SHALL NOT require the key.

#### Scenario: Missing API key
- **WHEN** the user runs `committy` with neither `OPENAI_API_KEY` nor `COMMITTY_OPENAI_API_KEY` set
- **THEN** the CLI prints "Missing OPENAI_API_KEY (or COMMITTY_OPENAI_API_KEY)" and exits with status 1

#### Scenario: Standard OpenAI key
- **WHEN** only `OPENAI_API_KEY` is set
- **THEN** the CLI uses it to call the API

#### Scenario: Dedicated committy key takes precedence
- **WHEN** both `COMMITTY_OPENAI_API_KEY` and `OPENAI_API_KEY` are set
- **THEN** the CLI uses `COMMITTY_OPENAI_API_KEY`

#### Scenario: Help without API key
- **WHEN** the user runs `committy --help` with no API key set
- **THEN** the CLI prints the usage and exits with status 0

### Requirement: Error reporting
Errors raised during the run (git failures, API failures, failed commit) SHALL be printed as `Error: <message>` in red, and the CLI SHALL exit with status 1. Informational outcomes where nothing is committed because nothing is staged SHALL keep exit status 0.

#### Scenario: Git commit fails
- **WHEN** `git commit` exits with a non-zero status (e.g. a hook rejects it)
- **THEN** the CLI prints "Error: git commit failed" and exits with status 1

#### Scenario: API call fails
- **WHEN** the OpenAI API rejects the request (e.g. an invalid API key)
- **THEN** the CLI prints `Error: <API message>`, does not commit and exits with status 1

#### Scenario: Nothing staged is not an error
- **WHEN** the user runs `committy` with nothing staged
- **THEN** the CLI prints "No staged changes found." and exits with status 0
