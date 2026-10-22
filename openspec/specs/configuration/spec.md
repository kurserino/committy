# configuration Specification

## Purpose
Let users and repositories persist committy settings in JSON config files, and define how those files combine with CLI flags, environment variables and built-in defaults.

## Requirements

### Requirement: Config file locations
The CLI SHALL read an optional project config file named `.committy` at the root of the git repository containing the current directory, and an optional user config file named `.committy` in the user's home directory. A missing file SHALL NOT be an error. When both paths are the same file, it SHALL be read once, as the project file. Help and version output SHALL NOT read config files.

#### Scenario: No config files
- **WHEN** neither `<repo>/.committy` nor `~/.committy` exists
- **THEN** the CLI behaves exactly as with flags and built-in defaults only

#### Scenario: Project file found from a subdirectory
- **WHEN** the user runs `committy` inside `<repo>/packages/app` and `<repo>/.committy` sets `"mode": "stat"`
- **THEN** the run uses mode `stat`

#### Scenario: User file applies in any repository
- **WHEN** `~/.committy` sets `"model": "gpt-5-mini"` and the repository has no `.committy`
- **THEN** the run uses model `gpt-5-mini`

### Requirement: Config file format
Each config file SHALL contain a single JSON object, encoded as UTF-8 (with or without a byte order mark) or as UTF-16LE/UTF-16BE with a byte order mark. When a file cannot be read or parsed, or its top-level value is not an object, the CLI SHALL print `Error: Invalid config file <path>: <reason>` and exit with status 1 without calling the API.

#### Scenario: Malformed JSON
- **WHEN** `<repo>/.committy` contains `{ "mode": "stat",, }`
- **THEN** the CLI prints an error naming the full path of that file and exits with status 1

#### Scenario: Top-level value is not an object
- **WHEN** `~/.committy` contains `["stat"]`
- **THEN** the CLI prints an error naming that file and exits with status 1

#### Scenario: UTF-8 file with a byte order mark
- **WHEN** `<repo>/.committy` is saved as UTF-8 with a BOM (e.g. by Notepad) and contains `{ "mode": "stat" }`
- **THEN** the run uses mode `stat`

#### Scenario: UTF-16 file written by Windows PowerShell
- **WHEN** `~/.committy` is UTF-16LE with a BOM (e.g. `echo '{"mode":"stat"}' > ~/.committy` in Windows PowerShell 5.1) or UTF-16BE with a BOM
- **THEN** the run uses mode `stat`

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

### Requirement: Credentials and endpoint never come from config files
Config files SHALL NOT be able to set the API key, the API base URL or any environment variable. Keys such as `apiKey` or `baseURL` SHALL be rejected as unknown keys, so a cloned repository cannot redirect requests or replace credentials.

#### Scenario: Repository tries to set the endpoint
- **WHEN** `<repo>/.committy` contains `{ "baseURL": "http://attacker.example" }`
- **THEN** the CLI prints an error naming the file and `baseURL`, exits with status 1 and sends no request

### Requirement: Settings precedence
For each setting the CLI SHALL use the first value found in this order: the CLI flag, the environment variable for that setting (only `COMMITTY_MODEL` exists), the project file, the user file, the built-in default. A flag SHALL count only when the user actually passed it. `exclude` is the exception and accumulates across layers (see diff-input "Additional excludes").

#### Scenario: Project file overrides user file
- **WHEN** `~/.committy` sets `"mode": "names"` and `<repo>/.committy` sets `"mode": "stat"`
- **THEN** the run uses mode `stat`

#### Scenario: Flag overrides both files
- **WHEN** both files set `"mode": "stat"` and the user runs `committy --mode full`
- **THEN** the run uses mode `full`

#### Scenario: Unpassed flag does not hide config
- **WHEN** `<repo>/.committy` sets `"maxInputChars": 20000` and the user runs `committy` without `--max-input-chars`
- **THEN** the input is capped at 20000 characters, not the built-in 16000

#### Scenario: Env var overrides files
- **WHEN** `COMMITTY_MODEL=gpt-4o` is set and `<repo>/.committy` sets `"model": "gpt-5-mini"`
- **THEN** the run uses model `gpt-4o`
