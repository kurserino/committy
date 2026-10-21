# commit-generation Specification

## Purpose
Generate a single-line Conventional Commit message from the user's staged changes using the OpenAI API, and optionally create the git commit with it.

## Requirements

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

### Requirement: Model selection
The CLI SHALL use the model given by `--model`, falling back to the `COMMITTY_MODEL` environment variable, then to `model` in the project config file, then to `model` in the user config file, and then to `gpt-5`. The model in use SHALL be printed before generation.

#### Scenario: Model from flag
- **WHEN** the user runs `committy --model gpt-4o`
- **THEN** the request is sent with model `gpt-4o` and "Using model: gpt-4o" is printed

#### Scenario: Default model
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set and no config file sets `model`
- **THEN** the request is sent with model `gpt-5`

#### Scenario: Model from config file
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set and `~/.committy` sets `"model": "gpt-5-mini"`
- **THEN** the request is sent with model `gpt-5-mini`

### Requirement: Commit message generation
The CLI SHALL send the prepared diff input to the OpenAI chat completions API with a prompt that asks for ONLY a single-line Conventional Commit message, and SHALL use the trimmed content of the first choice as the commit message.

#### Scenario: Message generated
- **WHEN** staged changes exist and the API responds successfully
- **THEN** the CLI prints "Generated message:" followed by the trimmed message

### Requirement: Fallback on input-size rate limits
When the API call fails with an error whose message matches tokens-per-minute or request-size limits (`tokens per min`, `TPM` or `Requested`), the CLI SHALL retry once using the `stat` input mode capped at `min(max-input-chars, 20000)` characters.

#### Scenario: TPM error triggers stat retry
- **WHEN** the first API call fails with a TPM-related error
- **THEN** the CLI prints a retry notice and calls the API again with a `DIFF_STAT` summary input

#### Scenario: Other API errors
- **WHEN** the API call fails with an error unrelated to TPM or request size
- **THEN** no retry is made and the error is reported

### Requirement: Committing with the generated message
Unless dry run is active, the CLI SHALL run `git commit -m <message>` passing arguments as an array (no shell quoting) with inherited stdio. Dry run SHALL be active when `--dry-run` is given, or when no `--no-dry-run` is given and the highest-precedence config file that sets `dryRun` sets it to `true`.

#### Scenario: Normal run commits
- **WHEN** the user runs `committy` with staged changes
- **THEN** "Committing changes..." is printed and `git commit -m <message>` is executed

#### Scenario: Dry run
- **WHEN** the user runs `committy --dry-run`
- **THEN** the message is printed along with "(Dry run: commit not executed)" and no commit is created

#### Scenario: Dry run from config file
- **WHEN** `~/.committy` sets `"dryRun": true` and the user runs `committy`
- **THEN** the message is printed along with "(Dry run: commit not executed)" and no commit is created

#### Scenario: Flag forces the commit
- **WHEN** `~/.committy` sets `"dryRun": true` and the user runs `committy --no-dry-run`
- **THEN** `git commit -m <message>` is executed

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

### Requirement: Version output
The CLI SHALL print its package version and exit with status 0 when run with `--version` or `-V`, without requiring an API key or a git repository.

#### Scenario: Version flag
- **WHEN** the user runs `committy --version`
- **THEN** the CLI prints the version from its package metadata (e.g. `1.0.0`) and exits with status 0

#### Scenario: Version without API key outside a repository
- **WHEN** the user runs `committy -V` with no API key set, outside a git repository
- **THEN** the CLI prints the version and exits with status 0

### Requirement: Environment file location
The CLI SHALL load a `.env` file only from its own installation directory (next to its `package.json`). It SHALL NOT load a `.env` from the current directory or from the repository being committed, so a repository cannot change the API key, the API endpoint or any other setting. Variables already set in the environment SHALL take precedence over the file.

#### Scenario: Repository .env is ignored
- **WHEN** the user runs `committy` in a repository whose `.env` sets `OPENAI_BASE_URL` or an API key
- **THEN** those values are not used

#### Scenario: Installation .env is read
- **WHEN** committy's installation directory has a `.env` that sets `OPENAI_API_KEY`
- **THEN** the CLI uses that key when the variable is not already set in the environment
