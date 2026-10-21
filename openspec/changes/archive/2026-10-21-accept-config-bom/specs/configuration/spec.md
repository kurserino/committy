# Spec Delta

## MODIFIED Requirements

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
