# Spec Delta

## MODIFIED Requirements

### Requirement: Default exclude patterns
The CLI SHALL exclude these patterns by default, at any depth of the repository: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.lock`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `*.min.*`, `*.map`, `*.snap`, `.env*`. The `--no-default-excludes` flag or `"defaultExcludes": false` in a config file SHALL disable them, and `--default-excludes` SHALL enable them, following the settings precedence (flag, then project file, then user file, then enabled).

#### Scenario: Lockfile ignored
- **WHEN** only `package-lock.json` changes alongside source files
- **THEN** the lockfile diff is not sent to the model

#### Scenario: Nested lockfile and build output ignored
- **WHEN** `web/package-lock.json` and `packages/app/dist/index.js` change alongside source files
- **THEN** neither is sent to the model

#### Scenario: Defaults disabled
- **WHEN** the user passes `--no-default-excludes`
- **THEN** none of the default patterns are excluded

#### Scenario: Defaults disabled by config file
- **WHEN** `<repo>/.committy` sets `"defaultExcludes": false`
- **THEN** none of the default patterns are excluded

#### Scenario: Flag re-enables defaults
- **WHEN** `<repo>/.committy` sets `"defaultExcludes": false` and the user runs `committy --default-excludes`
- **THEN** the default patterns are excluded

### Requirement: Additional excludes
The CLI SHALL accept `--exclude <pattern...>` with one or more extra git pathspec patterns, appended to the active excludes as `:(exclude)<pattern>` (relative to the current directory). Patterns from the `exclude` key of the user and project config files SHALL also be appended, relative to the repository root. Excludes SHALL accumulate: defaults, user file, project file and flags all apply together. A pattern that already starts with `:(` SHALL be passed to git unchanged.

#### Scenario: Extra exclude
- **WHEN** the user runs `committy --exclude 'docs/**' '*.md'`
- **THEN** changes matching `docs/**` or `*.md` are not considered

#### Scenario: Excludes from both files and flags accumulate
- **WHEN** `~/.committy` sets `"exclude": ["*.pdf"]`, `<repo>/.committy` sets `"exclude": ["generated/**"]` and the user runs `committy --exclude 'docs/**'`
- **THEN** changes matching `*.pdf`, `generated/**`, `docs/**` or a default pattern are not considered

#### Scenario: Config exclude is relative to the repository root
- **WHEN** `<repo>/.committy` sets `"exclude": ["generated/**"]` and the user runs `committy` inside `<repo>/src`
- **THEN** changes under `<repo>/generated/` are not considered

### Requirement: Input mode selection
The CLI SHALL accept `--mode` with values `auto` (default), `full`, `unified0`, `stat` and `names`, and SHALL cap the input at `--max-input-chars` characters (default 48000). When the flag is not passed, `mode` and `maxInputChars` from the config files SHALL apply, following the settings precedence. All diff modes SHALL use `--no-ext-diff` and `--find-renames`.

#### Scenario: Forced stat mode
- **WHEN** the user runs `committy --mode stat`
- **THEN** the model receives a `DIFF_STAT` summary instead of the diff

#### Scenario: Custom size cap
- **WHEN** the user runs `committy --max-input-chars 30000`
- **THEN** the input sent to the model is at most 30000 characters

#### Scenario: Mode from config file
- **WHEN** `<repo>/.committy` sets `"mode": "names"` and the user runs `committy` without `--mode`
- **THEN** the model receives a `FILENAMES` list instead of the diff
