// Fixed commit styles and the phrase that asks the model for each one
export const STYLES = {
  conventional: "a Conventional Commit (type(scope): description, e.g. feat: ..., fix: ...)",
  gitmoji:
    "a gitmoji commit (one gitmoji.dev emoji, a space, then a lowercase description, e.g. ✨ add ..., 🐛 fix ...)",
  "conventional-gitmoji":
    "a Conventional Commit with a gitmoji after the colon (e.g. feat(api): ✨ add ..., fix: 🐛 ...)",
  simple: "a plain git summary (capitalized imperative, no prefix, max 50 characters, e.g. Add ...)",
};

export const DEFAULT_STYLE = "conventional";
export const STYLE_CHOICES = [...Object.keys(STYLES), "auto"];

const EMOJI = String.raw`(?:\p{Extended_Pictographic}|:[a-z0-9_+-]+:)`;
const TYPE = String.raw`[a-z]+(?:\([^)]*\))?!?: `;

// Checked in order: the first matching rule classifies the subject
const RULES = [
  ["conventional-gitmoji", new RegExp(`^${TYPE}${EMOJI}`, "u")],
  ["conventional", new RegExp(`^${TYPE}\\S`, "u")],
  ["gitmoji", new RegExp(`^${EMOJI}`, "u")],
  ["simple", /^[A-Z](?![\w-]*:)/u],
];

export function classifySubject(subject) {
  return RULES.find(([, pattern]) => pattern.test(subject))?.[0] ?? null;
}

// Style used by more than half of the subjects, else the default
export function detectStyle(subjects) {
  const counts = {};
  for (const subject of subjects) {
    const style = classifySubject(subject.trim());
    if (style) counts[style] = (counts[style] ?? 0) + 1;
  }
  const winner = Object.keys(counts).find((style) => counts[style] > subjects.length / 2);
  return winner ?? DEFAULT_STYLE;
}
