# Spec Delta

## MODIFIED Requirements

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
