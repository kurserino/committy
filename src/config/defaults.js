export const DEFAULT_MODEL = "gpt-5";

export const DEFAULT_MAX_INPUT_CHARS = 48000;

// Exclude noisy paths by default to reduce tokens
export const DEFAULT_EXCLUDES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.lock",
  "node_modules/**",
  "dist/**",
  "build/**",
  "out/**",
  "coverage/**",
  "*.min.*",
  "*.map",
  "*.snap",
  ".env*",
];

// Glob pathspecs so the defaults also match nested paths (e.g. web/package-lock.json)
export const DEFAULT_EXCLUDE_PATHSPECS = DEFAULT_EXCLUDES.map(
  (pattern) => `:(exclude,glob)**/${pattern}`
);
