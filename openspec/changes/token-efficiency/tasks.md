# Tasks

## 1. Reasoning and output limits

- [x] 1.1 Add model detection and per-line-mode caps in `src/ai/openai.js`, and send `reasoning_effort`, `verbosity` and `max_completion_tokens` only for matching models
- [x] 1.2 Tests in `test/openai.test.js`: gpt-5 and gpt-5-mini get the params, gpt-4o does not, multi-line cap is larger than one-line cap

## 2. Hybrid input in auto mode

- [x] 2.1 Implement the per-file truncation helper and the `DIFF_PARTIAL` step in `src/input/prepare.js`, keeping the stat then names fallbacks
- [x] 2.2 Update `stripInputHeader` and the `INPUT_FORMATS` hint in `src/ai/prompt.js` for `DIFF_PARTIAL`
- [x] 2.3 Tests in `test/prepare.test.js` and `test/prompt.test.js` for each diff-input scenario: hybrid result within the limit, huge file does not hide small ones, hunk/line boundary with `[truncated]`, stat-only fallback, filenames fallback

## 3. Hybrid size cap (from the real-API benchmark)

- [x] 3.1 Cap the hybrid input at 12000 characters and 3000 characters per file in `src/input/prepare.js`
- [x] 3.2 Tests in `test/prepare.test.js` for the Hybrid input stays small scenario

## 4. New defaults

- [x] 4.1 Set `DEFAULT_MODEL` to `gpt-5-mini` and `DEFAULT_MAX_INPUT_CHARS` to 16000 in `src/config/defaults.js`
- [x] 4.2 Update the tests that assert the old defaults and add one for the default size cap
- [x] 4.3 Update the README default model and size cap

## 5. Verification

- [x] 5.1 Run `npm test` and `openspec validate token-efficiency --strict`
