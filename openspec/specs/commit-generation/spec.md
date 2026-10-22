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
The CLI SHALL use the model given by `--model`, falling back to the `COMMITTY_MODEL` environment variable, then to `model` in the project config file, then to `model` in the user config file, and then to `gpt-5-mini`. The model in use SHALL be printed before generation.

#### Scenario: Model from flag
- **WHEN** the user runs `committy --model gpt-4o`
- **THEN** the request is sent with model `gpt-4o` and "Using model: gpt-4o" is printed

#### Scenario: Default model
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set and no config file sets `model`
- **THEN** the request is sent with model `gpt-5-mini`

#### Scenario: Model from config file
- **WHEN** neither `--model` nor `COMMITTY_MODEL` is set and `~/.committy` sets `"model": "gpt-5"`
- **THEN** the request is sent with model `gpt-5`

### Requirement: Commit message generation
The CLI SHALL send the prepared diff input to the OpenAI chat completions API with a prompt that asks for ONLY a commit message in the selected style (see "Message style") and line mode (see "One-line and multi-line messages"), and SHALL use the cleaned-up content of the first choice (see "Response clean-up") as the commit message.

#### Scenario: Message generated
- **WHEN** staged changes exist and the API responds successfully
- **THEN** the CLI prints "Generated message:" followed by the cleaned-up message

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

### Requirement: Message style
The CLI SHALL accept a style through `--style <style>` or the `style` config key, with values `conventional` (default), `gitmoji`, `conventional-gitmoji`, `simple` and `auto`, following the settings precedence. The prompt SHALL ask for the selected fixed style: `type(scope): description`; a gitmoji then a description; `type(scope): <gitmoji> description`; or a capitalized imperative summary without prefix of at most 50 characters.

#### Scenario: Default style
- **WHEN** no flag or config file sets the style
- **THEN** the prompt asks for a Conventional Commit message

#### Scenario: Style from config file
- **WHEN** `<repo>/.committy` sets `"style": "gitmoji"`
- **THEN** the prompt asks for a gitmoji message

#### Scenario: Style flag overrides config
- **WHEN** `~/.committy` sets `"style": "gitmoji"` and the user runs `committy --style simple`
- **THEN** the prompt asks for a plain imperative summary without prefix

#### Scenario: Invalid style flag
- **WHEN** the user runs `committy --style foo`
- **THEN** the CLI prints an error mentioning `--style`, `foo` and the allowed values, and exits with status 1 without running git or calling the API

### Requirement: Automatic style detection
With style `auto`, the CLI SHALL read the subjects of the last 20 non-merge commits of the current repository, classify each as `conventional-gitmoji`, `conventional`, `gitmoji` or `simple`, and use the style that matches more than half of them; otherwise, or when the repository has no commits, it SHALL use `conventional`. Detection SHALL NOT call the API. The CLI SHALL print `Detected commit style: <style>`.

#### Scenario: Gitmoji history
- **WHEN** style is `auto` and most recent subjects look like `✨ add login`
- **THEN** the CLI prints "Detected commit style: gitmoji" and the prompt asks for a gitmoji message

#### Scenario: Mixed history falls back
- **WHEN** style is `auto` and no style matches more than half of the recent subjects
- **THEN** the CLI uses `conventional`

#### Scenario: Repository without commits
- **WHEN** style is `auto` in a repository with no commits yet
- **THEN** the CLI uses `conventional` and does not fail

### Requirement: One-line and multi-line messages
The CLI SHALL accept the line mode through `--one-line` / `--no-one-line` or the `oneLine` config key (default `true`), following the settings precedence. In one-line mode the prompt SHALL ask for a single line. Otherwise it SHALL ask for a subject line, a blank line and 2 to 5 short `- ` bullets on what changed and why, wrapped at 72 columns, and the whole message SHALL be committed.

#### Scenario: One line by default
- **WHEN** no flag or config file sets the line mode
- **THEN** the prompt asks for a single-line message

#### Scenario: Multi-line from config file
- **WHEN** `~/.committy` sets `"oneLine": false` and the model returns a subject, a blank line and bullets
- **THEN** the prompt asks for a subject, a blank line and bullets, and the commit is created with the full message

#### Scenario: Flag forces one line
- **WHEN** `~/.committy` sets `"oneLine": false` and the user runs `committy --one-line`
- **THEN** the prompt asks for a single-line message

### Requirement: Response clean-up
The CLI SHALL trim the model response and remove a surrounding markdown code fence if present. In one-line mode it SHALL keep only the first non-empty line, so the commit never has a body.

#### Scenario: Extra lines in one-line mode
- **WHEN** one-line mode is active and the model returns `feat: add login\n\nAdds the login form.`
- **THEN** the commit message is `feat: add login`

#### Scenario: Fenced response
- **WHEN** the model returns the message wrapped in a ``` code fence
- **THEN** the fence lines are not part of the commit message

### Requirement: Empty generated message
When the message is empty after clean-up, the CLI SHALL print `Error: The model returned an empty commit message` and exit with status 1 without running `git commit`, also in dry runs.

#### Scenario: Empty response
- **WHEN** the model returns only whitespace or an empty code fence
- **THEN** the CLI prints "Error: The model returned an empty commit message", does not commit and exits with status 1

#### Scenario: Empty response in a dry run
- **WHEN** the user runs `committy --dry-run` and the model returns an empty answer
- **THEN** the CLI prints the same error and exits with status 1

### Requirement: Output limits for gpt-5 reasoning models
When the selected model is `gpt-5`, `gpt-5-mini` or `gpt-5-nano` (optionally with a date suffix such as `-2025-08-07`), the request SHALL include `reasoning_effort: "minimal"`, `verbosity: "low"` and a `max_completion_tokens` cap. For any other model the request SHALL NOT include these three parameters.

#### Scenario: Default model gets minimal reasoning
- **WHEN** the request is sent with model `gpt-5`
- **THEN** it includes `reasoning_effort` `minimal`, `verbosity` `low` and a `max_completion_tokens` value

#### Scenario: gpt-5 variant gets the same limits
- **WHEN** the request is sent with model `gpt-5-mini`
- **THEN** it includes `reasoning_effort` `minimal`, `verbosity` `low` and a `max_completion_tokens` value

#### Scenario: Other models are untouched
- **WHEN** the request is sent with model `gpt-4o`
- **THEN** it includes none of `reasoning_effort`, `verbosity` and `max_completion_tokens`

### Requirement: Output token cap by line mode
The `max_completion_tokens` cap SHALL be larger in multi-line mode than in one-line mode, and in both modes large enough for a complete message.

#### Scenario: Multi-line cap is larger
- **WHEN** requests are sent for a gpt-5 model in one-line and in multi-line mode
- **THEN** the multi-line request has a greater `max_completion_tokens` than the one-line request

### Requirement: Cut-off reply
When the API reports that the reply was cut off by the output token limit (finish reason `length`), the CLI SHALL print `Error: The model reply was cut off` and exit with status 1 without creating a commit.

#### Scenario: Reply cut off
- **WHEN** the API responds with finish reason `length`
- **THEN** the CLI prints "Error: The model reply was cut off", exits with status 1 and no commit is made
