# Tasks

## 1. Hook

- [x] 1.1 Fix the install check by scope and project path, and honor `CLAUDE_CONFIG_DIR`, in `.claude/hooks/ensure-claudekit.mjs`
- [x] 1.2 Add `test/ensure-claudekit.test.js`: no file, installed for another project (warns), installed for this project (silent), user scope (silent)
- [x] 1.3 Apply the same fix to `templates/hooks/ensure-claudekit.mjs` in claudekit

## 2. Verification

- [x] 2.1 Run `npm test` and `openspec validate fix-ensure-claudekit --strict`
