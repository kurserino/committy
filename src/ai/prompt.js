// Prompt template - keep it compact on purpose
export const buildPrompt = (inputText) =>
  `Return ONLY a single-line Conventional Commit message (e.g. feat: ..., fix: ...). Input may be a DIFF, a minimal diff (U0), a STAT summary or just FILENAMES.\n\n${inputText}`;
