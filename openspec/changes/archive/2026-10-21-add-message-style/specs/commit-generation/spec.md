# Spec Delta

## MODIFIED Requirements

### Requirement: Commit message generation
The CLI SHALL send the prepared diff input to the OpenAI chat completions API with a prompt that asks for ONLY a commit message in the selected style (see "Message style") and line mode (see "One-line and multi-line messages"), and SHALL use the cleaned-up content of the first choice (see "Response clean-up") as the commit message.

#### Scenario: Message generated
- **WHEN** staged changes exist and the API responds successfully
- **THEN** the CLI prints "Generated message:" followed by the cleaned-up message

## ADDED Requirements

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
