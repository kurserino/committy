# Tasks

## 1. Version output

- [x] 1.1 Read the version from `package.json` and register it with `program.version()` in `src/cli.js`, and verify with `test/bin.test.js` cases that `--version` and `-V` print it and exit 0 with no API key, outside a git repository

## 2. Option validation

- [x] 2.1 Define `--mode` with commander `choices` and verify with a `test/bin.test.js` case that `--mode foo` exits 1 naming `--mode`, `foo` and the allowed values, without git output
- [x] 2.2 Parse `--max-input-chars` as a positive integer (default 48000) and verify with `test/bin.test.js` cases that `abc`, `0`, `-5` and `1.5` exit 1 naming the option and value, and that `test/cli.test.js` still passes

## 3. Spec wording

- [x] 3.1 Verify the reworded "Git invocation" scenarios are covered by existing tests (`test/git-run.test.js` for git errors, `test/git-commit.test.js` for special characters)

## 4. Integration

- [x] 4.1 Run `npm test` and `openspec validate validate-cli-options --strict` and verify both pass

## Workflow follow-up

- Archive the change with `/opsx:archive`, then run the spec-drift skill and record the check in `openspec/.last-drift-check`.
