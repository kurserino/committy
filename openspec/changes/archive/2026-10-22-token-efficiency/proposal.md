# Proposal

## Why

Each run pays for tokens the commit message does not need. The default model, `gpt-5`, is a reasoning model and the request sets no reasoning or output limits, so hidden reasoning tokens can cost more than the diff itself. In `auto` mode a single large file pushes the whole input down to the `--stat` summary, which drops all the actual changes and yields generic messages.

## What Changes

- Send `reasoning_effort: "minimal"`, `verbosity: "low"` and a `max_completion_tokens` cap, only when the selected model belongs to the gpt-5 reasoning family. Other models (for example `gpt-4o`) receive none of these parameters.
- Change the default model from `gpt-5` to `gpt-5-mini` and the default `--max-input-chars` from 48000 to 16000. **BREAKING** for users relying on the old defaults: they can set `model` / `maxInputChars` in a config file or pass the flags. Real-API benchmark: `gpt-5-mini` matched `gpt-5` in message quality at about a fifth of the price, while `gpt-5-nano` picked wrong types and leaked wording.
- In `auto` mode, when the zero-context diff exceeds the size cap, send a hybrid input: the full `--stat` plus the zero-context diff truncated per file (per-file budget, cut at hunk or line boundaries, marked `[truncated]`). Only when that is not possible fall back to `--stat` alone, then to file names.

## Capabilities

### New Capabilities

### Modified Capabilities
- `commit-generation`: adds requirements for reasoning, verbosity and output limits on gpt-5 family models; the default model becomes `gpt-5-mini`.
- `diff-input`: the automatic fallback in `auto` mode gains the hybrid stat + truncated diff step; the default size cap becomes 16000.
- `configuration`: the precedence scenario referring to the built-in size cap is updated.

## Impact

- `src/ai/openai.js` (request parameters), `src/input/prepare.js` (hybrid input, header handling), `src/ai/prompt.js` (input format hint).
- `src/config/defaults.js` (defaults) and README (documented defaults).
- Tests in `test/openai.test.js`, `test/prepare.test.js`, `test/prompt.test.js`.
- No new dependencies, no new flags, no config changes.
