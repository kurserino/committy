# Design

## Context

See proposal.md - Why. Options are parsed by commander in `src/cli.js`; `commitAction` receives already-parsed values. `--max-input-chars` is currently a string converted with `Number()`, which turns `abc` into `NaN` and makes every size check fail. `--mode` is a free string that `prepareInputForModel` treats as `auto` when unknown.

## Goals / Non-Goals

**Goals:**
- Reject invalid option values at parse time, before any git command or API call.
- Use the package version as the single source of truth for `--version`.

**Non-Goals:**
- Changing `prepareInputForModel`'s internal handling of unknown modes (it is no longer reachable from the CLI).
- Custom wording for commander's usage errors.

## Decisions

- **Validate with commander, not in `commitAction`.** `--mode` uses `new Option(...).choices([...])` and `--max-input-chars` uses a custom argument parser that throws `InvalidArgumentError` for anything that is not a positive integer. Commander then prints `error: option '...' argument '...' is invalid. ...` and exits with status 1 before the action runs, so git and the API are never touched. Alternative: validate inside `commitAction`; rejected because it duplicates commander's built-in usage-error path and its exit handling.
- **Version from `package.json`.** Read once with `readFileSync(new URL("../package.json", import.meta.url))` and passed to `program.version()`, which adds `-V, --version`. Alternative: hardcode the version; rejected because it would drift from the package.

## Risks / Trade-offs

- [Option errors use commander's message format, not `Error: ...`] → Spec only requires the option, value and allowed values to be named and exit status 1; commander's message satisfies that.
