# Tasks

## 1. Hybrid input limit

- [x] 1.1 In `truncateFileDiff` (`src/input/prepare.js`) return null when the budget cannot hold the truncation marker
- [x] 1.2 Test in `test/prepare.test.js`: six files, limit 1500, the input stays within the limit

## 2. Cut-off reply

- [x] 2.1 In `src/ai/openai.js` throw an error when the first choice has finish reason `length`
- [x] 2.2 Test in `test/openai.test.js` (error thrown with the message; the CLI already exits 1 without committing on any API error)

## 3. Verification

- [x] 3.1 Run `npm test` and `openspec validate harden-hybrid-input --strict`
