# Spec Delta

## MODIFIED Requirements

### Requirement: Allowed config keys
A config file SHALL accept only these keys: `model` (non-empty string), `mode` (`auto`, `full`, `unified0`, `stat` or `names`), `maxInputChars` (positive integer), `exclude` (array of non-empty strings), `defaultExcludes` (boolean), `dryRun` (boolean), `style` (`conventional`, `gitmoji`, `conventional-gitmoji`, `simple` or `auto`) and `oneLine` (boolean). An unknown key or an invalid value SHALL print an error naming the file and the key, and exit with status 1 without calling the API.

#### Scenario: Unknown key
- **WHEN** `<repo>/.committy` contains `{ "modle": "gpt-4o" }`
- **THEN** the CLI prints an error naming the file and `modle`, and exits with status 1

#### Scenario: Invalid value
- **WHEN** `~/.committy` contains `{ "maxInputChars": 0 }`
- **THEN** the CLI prints an error naming the file and `maxInputChars`, and exits with status 1

#### Scenario: Invalid style
- **WHEN** `<repo>/.committy` contains `{ "style": "emoji" }`
- **THEN** the CLI prints an error naming the file and `style`, and exits with status 1
