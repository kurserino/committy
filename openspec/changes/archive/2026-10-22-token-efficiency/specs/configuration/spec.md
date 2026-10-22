## MODIFIED Requirements

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
