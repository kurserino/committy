import {
  DEFAULT_EXCLUDE_PATHSPECS,
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MODEL,
} from "./defaults.js";

const DEFAULT_MODE = "auto";

// First value that is set, from highest to lowest precedence
const pick = (...values) => values.find((v) => v !== undefined && v !== "");

// Config file patterns are relative to the repository root
const fromRoot = (pattern) => (pattern.startsWith(":(") ? pattern : `:(top,exclude)${pattern}`);

// Settings for one run: flag > env > project file > user file > default.
// `exclude` accumulates instead: defaults, user file, project file, then flags.
export function resolveSettings({ flags = {}, env = {}, project = {}, user = {} }) {
  const maxInputChars = pick(flags.maxInputChars, project.maxInputChars, user.maxInputChars);
  const defaultExcludes = pick(flags.defaultExcludes, project.defaultExcludes, user.defaultExcludes);

  return {
    model: pick(flags.model, env.COMMITTY_MODEL, project.model, user.model) ?? DEFAULT_MODEL,
    mode: pick(flags.mode, project.mode, user.mode) ?? DEFAULT_MODE,
    maxInputChars: maxInputChars === undefined ? DEFAULT_MAX_INPUT_CHARS : Number(maxInputChars),
    dryRun: pick(flags.dryRun, project.dryRun, user.dryRun) ?? false,
    excludes: [
      ...(defaultExcludes === false ? [] : DEFAULT_EXCLUDE_PATHSPECS),
      ...(user.exclude ?? []).map(fromRoot),
      ...(project.exclude ?? []).map(fromRoot),
      ...(Array.isArray(flags.exclude) ? flags.exclude : []),
    ],
  };
}
