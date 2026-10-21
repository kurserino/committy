# Spec Delta

## ADDED Requirements

### Requirement: Environment file location
The CLI SHALL load a `.env` file only from its own installation directory (next to its `package.json`). It SHALL NOT load a `.env` from the current directory or from the repository being committed, so a repository cannot change the API key, the API endpoint or any other setting. Variables already set in the environment SHALL take precedence over the file.

#### Scenario: Repository .env is ignored
- **WHEN** the user runs `committy` in a repository whose `.env` sets `OPENAI_BASE_URL` or an API key
- **THEN** those values are not used

#### Scenario: Installation .env is read
- **WHEN** committy's installation directory has a `.env` that sets `OPENAI_API_KEY`
- **THEN** the CLI uses that key when the variable is not already set in the environment

## MODIFIED Requirements

### Requirement: API key configuration
The CLI SHALL read the OpenAI API key from `OPENAI_API_KEY`, unless `COMMITTY_OPENAI_API_KEY` is set, which takes precedence (both may also come from the `.env` described in "Environment file location"). The key SHALL only be required for a commit run: when it is missing, the run SHALL print an error and exit with status 1 before running any git command. Help and version output SHALL NOT require the key.

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
