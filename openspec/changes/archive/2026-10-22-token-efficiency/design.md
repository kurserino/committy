# Design

## Context

`generateCommitMessage` (`src/ai/openai.js`) sends only `model` and one user message. `prepareInputForModel` (`src/input/prepare.js`) tries `DIFF_U0`, then `DIFF_STAT`, then `FILENAMES`; the `full` and `unified0` modes cut at `maxChars` with a plain slice. The `stat` retry on rate limits in `cli.js` calls `prepareInputForModel` with `mode: "stat"` and is unaffected.

## Goals / Non-Goals

**Goals:**
- Cut reasoning and output tokens for the default model without breaking other models.
- Keep information about every changed file in large diffs.

**Non-Goals:**
- Adding flags or config keys.
- Changing the `full`, `unified0`, `stat` and `names` modes, or the TPM retry.
- Diff noise reduction (`-D`, whitespace) and the broader error-matching regex; separate changes.

## Decisions

- **Model detection by allow-list**: `/^gpt-5(-mini|-nano)?(-\d{4}-\d{2}-\d{2})?$/`. `reasoning_effort: "minimal"` is only valid on these; a prefix match would also hit `gpt-5-chat-latest` and later `gpt-5.x` models that reject it. Alternative (send always, retry without on a 400) was rejected: extra request and error handling.
- **Caps**: `max_completion_tokens` of 256 (one-line) and 512 (multi-line). With minimal reasoning this leaves room for the message; tune only if real outputs get cut.
- **Hybrid input**: new header `DIFF_PARTIAL`. Layout: `DIFF_PARTIAL\n<stat>\n\n<per-file diffs>`. The stat is included whole and must use at most half of `maxChars`; otherwise there is no hybrid and the existing stat fallback applies.
- **Hybrid size cap**: a benchmark with the real API showed that filling `maxChars` (~20k input tokens) made large-diff runs about 5x more expensive than stat-only, even though messages were far better. The hybrid input is capped at `min(maxChars, 12000)` characters and each file at 3000: the start of a huge file is enough to name the change, and more of it adds cost, not information.
- **Per-file budget**: split the U0 diff on `diff --git ` lines; process files in order, giving each `min(3000, max(400, floor(remaining / filesLeft)))` characters, so unused budget flows to later files. A file that fits is kept whole.
- **Cut point**: last `@@` hunk start that fits, else last newline that fits; a file with no room for even its header is omitted (the stat still lists it). A `[truncated]` line is appended to cut files.
- **Prompt hint**: `INPUT_FORMATS` mentions the partial format so the model knows `[truncated]` means more changes exist. `stripInputHeader` also strips `DIFF_PARTIAL`.

- **New defaults**: `gpt-5-mini` and 16000 characters. Benchmarks (2 runs per scenario, 5 scenarios): mini matched gpt-5 quality; nano was unreliable. 16000 sits just above the 12000 hybrid cap, so diffs up to ~4k tokens go whole and larger ones use the hybrid input.

## Risks / Trade-offs

- Users who relied on the old defaults get cheaper but slightly different output; both are overridable by flag or config file.

- A new gpt-5 family model not matching the allow-list loses the savings until the list is updated; the failure mode is safe.
- 256 tokens could truncate an unusually long subject; the cap is generous for one line.
- The hybrid input adds code over slice-and-stat; it stays contained in one helper in `prepare.js`.
