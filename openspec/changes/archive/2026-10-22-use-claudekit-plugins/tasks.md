# Tasks

## 1. Migrate to the plugins

- [x] 1.1 Add `.claude/hooks/ensure-claudekit.mjs` and wire it as a `SessionStart` hook in `.claude/settings.json`
- [x] 1.2 Declare the `claudekit` and `ponytail` marketplaces and enable `claudekit-core`, `claudekit-openspec` and `ponytail` in `.claude/settings.json`; remove the old hook wiring
- [x] 1.3 Remove `.claude/skills`, `.claude/commands` and the hooks now provided by the plugins
- [x] 1.4 Update the Commits section of `CLAUDE.md` to name the `claudekit-core` plugin instead of the local hook

## 2. Verification

- [x] 2.1 Install the plugins in this project, then confirm the commit-identity guard blocks a wrong identity and the OpenSpec skills load
- [x] 2.2 Run `npm test` and `openspec validate use-claudekit-plugins --strict`
