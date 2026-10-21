# Design

## Context

`buildPrompt(inputText)` in `src/ai/prompt.js` returns one fixed sentence plus the input. `generateCommitMessage` trims the response and returns it. `runGitCommit` already passes the message as one `-m` argument, so multi-line messages need no change there. Settings come from `resolveSettings` (see the `configuration` spec).

## Goals / Non-Goals

**Goals:**
- Keep the prompt compact: one short instruction per style and line mode, with no long examples.
- Detection is local, deterministic and testable without the API.

**Non-Goals:**
- No free-text custom prompt or template (roadmap item "custom prompt templates" stays open).
- No detection of other conventions (Angular-only types, ticket prefixes). Unrecognized history falls back to `conventional`.
- No body in the TPM fallback beyond what the model writes from the stat summary.

## Decisions

**Style table.** `src/ai/style.js` exports `STYLES` (fixed styles to prompt phrase), `STYLE_CHOICES` (`[...fixed, "auto"]`) and `detectStyle(subjects)`. `src/config/schema.js` imports `STYLE_CHOICES` so validation, flag choices and the prompt share one list.

Prompt shape (a single sentence, then the existing input description):
- one-line: `Return ONLY a single-line commit message as <phrase>.`
- multi-line: `Return ONLY a commit message: a subject line as <phrase>, a blank line, then 2-5 short "- " bullets on what changed and why, wrapped at 72 columns.`

Phrases:
- conventional: `a Conventional Commit (type(scope): description, e.g. feat: ..., fix: ...)`
- gitmoji: `a gitmoji commit (one gitmoji.dev emoji, a space, then a lowercase description, e.g. ✨ add ..., 🐛 fix ...)`
- conventional-gitmoji: `a Conventional Commit with a gitmoji after the colon (e.g. feat(api): ✨ add ..., fix: 🐛 ...)`
- simple: `a plain git summary (capitalized imperative, no prefix, max 50 characters, e.g. Add ...)`

**Detection rules** (checked in this order, first match wins):
1. conventional-gitmoji: `^[a-z]+(\([^)]*\))?!?: (emoji|:shortcode:)`
2. conventional: `^[a-z]+(\([^)]*\))?!?: \S`
3. gitmoji: `^(emoji|:shortcode:)`
4. simple: `^[A-Z]` (with no `word:` prefix)

Emoji means `\p{Extended_Pictographic}` with the `u` flag, which Node 18 supports. A style wins with strictly more than half of the subjects. Alternative: plurality. Rejected because a mixed history should not flip the default.

**Reading history.** `getRecentSubjects(limit)` in `src/git/log.js` runs `git log -n <limit> --no-merges --format=%s` with spawnSync args. A non-zero exit (a repository with no commits) returns `[]` instead of throwing. Detection runs in `commitAction` after settings resolution and before generation, only when style is `auto`.

**Flags.** `--style <style>` uses `Option().choices(STYLE_CHOICES)` with no default, and `--one-line` / `--no-one-line` are defined positive-first, so they are `undefined` when not passed. This is the same pattern as `--dry-run`.

**Clean-up.** `cleanMessage(content, { oneLine })` lives in `src/ai/prompt.js` next to the prompt it answers. It trims the response, drops a leading ```` ```lang ```` line and a trailing ```` ``` ```` line, and in one-line mode keeps the first non-empty line. `generateCommitMessage({ inputText, model, style, oneLine, client })` builds the prompt and cleans the response. `style` defaults to `conventional` and `oneLine` to `true`, so existing callers keep working.

## Risks / Trade-offs

- [Models may ignore the 50-character limit or the bullet count] → They are prompt guidance, not enforced. Only one-line mode is enforced, because it changes the commit shape.
- [Gitmoji subjects using `:shortcode:` instead of the emoji] → Both forms count in detection, and the prompt asks for the emoji itself.
- [Prompt grows slightly] → About 20 extra tokens at most, which is negligible next to the diff.

## Migration Plan

No migration. With no `style` or `oneLine` set, the prompt asks for the same single-line Conventional Commit as before.
