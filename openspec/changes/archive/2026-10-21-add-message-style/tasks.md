# Tasks

## 1. Styles and prompt

- [x] 1.1 Add `src/ai/style.js` with `STYLES`, `STYLE_CHOICES` and `detectStyle(subjects)`; verify unit tests in `test/style.test.js` for each classification rule, the more-than-half threshold, mixed history and an empty list falling back to `conventional`
- [x] 1.2 Change `buildPrompt(inputText, { style, oneLine })` and add `cleanMessage(content, { oneLine })` in `src/ai/prompt.js`; verify `test/prompt.test.js` covers each style phrase in both line modes, the defaults (conventional, one line), fence removal and first-line extraction
- [x] 1.3 Pass `style` and `oneLine` through `generateCommitMessage` and clean the response; verify `test/openai.test.js` asserts the request prompt and the cleaned message

## 2. Recent commit subjects

- [x] 2.1 Add `getRecentSubjects(limit)` in `src/git/log.js` (`git log -n <limit> --no-merges --format=%s`, args array, `[]` on a repository without commits); verify tests in `test/git-log.test.js` with a temp repo, including merges excluded and an empty repo

## 3. Settings

- [x] 3.1 Add `style` and `oneLine` to `src/config/schema.js` and `resolveSettings` (defaults `conventional`, `true`); verify schema and resolver tests for valid values, the "Invalid style" scenario and precedence

## 4. CLI

- [x] 4.1 Add `--style <style>` (choices, no default) and `--one-line` / `--no-one-line` to `src/cli.js`; when style is `auto`, detect it and print `Detected commit style: <style>`; pass style and line mode to generation, including the TPM retry; verify CLI tests for Default style, Style from config file, Style flag overrides config, Gitmoji history, Mixed history falls back, Repository without commits, One line by default, Multi-line from config file (commit receives the full message), Flag forces one line
- [x] 4.2 Add a `bin` test for `--style foo` exiting 1 with an error naming `--style` and `foo`; verify `npm test` passes

## 5. Documentation

- [x] 5.1 Document `style` and `oneLine` (keys, flags, example outputs per style, auto detection) in README; verify the README example config still parses with `loadConfigFile`

## 6. Verification

- [x] 6.1 Run `npm test` and `openspec validate add-message-style --strict`; manually run the linked `committy --dry-run` against the real API with `--style gitmoji`, `--style simple`, `--no-one-line` and `--style auto` in this repository, and confirm each output matches the requested shape

## Workflow follow-up

- Archive the change, run the spec-drift check, then the finish-feature flow.
