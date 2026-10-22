import { DEFAULT_STYLE, STYLES } from "./style.js";

const INPUT_FORMATS =
  "Input may be a DIFF, a minimal diff (U0), a STAT summary or just FILENAMES; PARTIAL is a STAT plus a diff cut where marked [truncated].";

// Prompt template - keep it compact on purpose
export function buildPrompt(inputText, { style = DEFAULT_STYLE, oneLine = true } = {}) {
  const phrase = STYLES[style];
  const ask = oneLine
    ? `Return ONLY a single-line commit message as ${phrase}.`
    : `Return ONLY a commit message: a subject line as ${phrase}, a blank line, then 2-5 short "- " bullets on what changed and why, wrapped at 72 columns.`;
  return `${ask} ${INPUT_FORMATS}\n\n${inputText}`;
}

// Strips a surrounding code fence; in one-line mode keeps only the first non-empty line
export function cleanMessage(content, { oneLine = true } = {}) {
  let text = content.trim();
  const fenced = text.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1].trim();
  if (oneLine) text = text.split("\n").find((line) => line.trim())?.trim() ?? "";
  return text;
}
