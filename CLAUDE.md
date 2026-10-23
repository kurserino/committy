# Committy

Node.js ESM CLI that generates Conventional Commit messages from staged changes with the OpenAI API. Entry point `bin/committy.js`; code in `src/` (`config/`, `git/`, `input/`, `ai/`); tests in `test/` (node:test, real temporary git repos, no network). Specs live in `openspec/specs/`.

## Commands

- `npm test`: full test suite (must pass before any change is done)
- `openspec validate --specs --strict`: validate the main specs
- `openspec list` / `openspec list --specs`: active changes / capabilities

## Spec-driven workflow (mandatory)

Every change to behavior in `src/` or `bin/` goes through OpenSpec so the specs always describe what the code does:

1. **Propose**: create a change with the openspec-propose workflow (`/opsx:propose`). Pure refactors, tooling or docs with no behavior change still get a change, with `skip_specs: true` in its `.openspec.yaml`.
2. **Apply**: implement with the openspec-apply-change workflow (`/opsx:apply`). Each scenario in the delta specs needs a test in `test/`.
3. **Verify**: `npm test` and `openspec validate <change> --strict` must pass.
4. **Archive**: `/opsx:archive` merges the deltas into `openspec/specs/`.
5. **Drift check**: run the spec-drift skill after every archive. It compares the specs with the code and asks the user how to resolve each divergence.
6. **Finish**: once the drift check is recorded and committed, run the finish-feature skill. It shows the commits and the PR draft for validation, then asks, one step at a time, whether to open the PR, merge it, delete the remote branch, and update `main` (deleting the local branch or not).

Work on a branch created from an up-to-date `main` for every feature.

Rules:
- Never edit `openspec/specs/` by hand; spec changes go through a change's delta specs.
- If the user asks for a code change directly, start by proposing the OpenSpec change instead of editing code. For a one-line fix, a short change is fine, but it still exists.
- If you find behavior that contradicts a spec while working on something else, do not silently fix either side: report it and run the spec-drift skill.

## Conventions

- Cross-platform (Windows PowerShell, macOS, Linux): never run git through a shell; pass argument arrays to `spawnSync`.
- Errors exit with status 1; "nothing to commit" outcomes exit with 0.
- API key: `OPENAI_API_KEY` by default, `COMMITTY_OPENAI_API_KEY` overrides it.
- OpenSpec artifacts are written in English.

## Commits

These rules override any default commit/PR attribution guidance:

- Author every commit as `Kurse <lucas.kurse@hotmail.com>`, the email linked to the GitHub account `kurserino`. Make sure `git config user.name` and `git config user.email` match before committing; set them in the repository if they don't.
- Never add Claude attribution: no `Co-Authored-By: Claude ...` trailer in commits and no "Generated with Claude Code" line in PR descriptions.
- `.claude/settings.json` turns off attribution, and the `claudekit-core` plugin (kurserino/claudekit) blocks any `git commit` that breaks these rules. The OpenSpec skills, `opsx` commands and hooks come from the `claudekit-openspec` plugin, and the `claudekit-diff` plugin opens the `/diff` panel once per session, as soon as the terminal is wide enough. All three are enabled in `.claude/settings.json`; `.claude/hooks/ensure-claudekit.mjs` warns at session start when any of them, or the `ponytail` plugin (also enabled there), is not installed.
