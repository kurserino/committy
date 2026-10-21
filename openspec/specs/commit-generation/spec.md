# commit-generation Specification

## Purpose
Generate a single-line Conventional Commit message from the user's staged changes using the OpenAI API, and optionally create the git commit with it.

## Requirements

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

### Requirement: Model selection
The CLI SHALL use the model given by `--model`, falling back to the `COMMITTY_MODEL` environment variable, and then to `gpt-5`. The model in use SHALL be printed before generation.

#### Scenario: Model from flag
- **WHEN** the user runs `committy --model gpt-4o`
- **THEN** the request is sent with model `gpt-4o` and "Using model: gpt-4o" is printed

#### Scenario: Default model
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set
- **THEN** the request is sent with model `gpt-5`

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
Unless `--dry-run` is given, the CLI SHALL run `git commit -m <message>` passing arguments as an array (no shell quoting) with inherited stdio.

#### Scenario: Normal run commits
- **WHEN** the user runs `committy` with staged changes
- **THEN** "Committing changes..." is printed and `git commit -m <message>` is executed

#### Scenario: Dry run
- **WHEN** the user runs `committy --dry-run`
- **THEN** the message is printed along with "(Dry run: commit not executed)" and no commit is created

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
