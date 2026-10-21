export const MODES = ["auto", "full", "unified0", "stat", "names"];

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

// Keys a config file may set; each validator returns an error reason or null.
// Credentials and the API endpoint are deliberately absent: config files are untrusted.
export const CONFIG_KEYS = {
  model: (v) => (isNonEmptyString(v) ? null : "must be a non-empty string"),
  mode: (v) => (MODES.includes(v) ? null : `must be one of ${MODES.join(", ")}`),
  maxInputChars: (v) => (Number.isInteger(v) && v > 0 ? null : "must be a positive integer"),
  exclude: (v) =>
    Array.isArray(v) && v.every(isNonEmptyString)
      ? null
      : "must be an array of non-empty strings",
  defaultExcludes: (v) => (typeof v === "boolean" ? null : "must be true or false"),
  dryRun: (v) => (typeof v === "boolean" ? null : "must be true or false"),
};

// Returns the reason the config object is invalid, or null when it is valid
export function validateConfig(config) {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return "expected a JSON object";
  }
  for (const [key, value] of Object.entries(config)) {
    const validate = CONFIG_KEYS[key];
    if (!validate) {
      return `unknown key "${key}" (allowed: ${Object.keys(CONFIG_KEYS).join(", ")})`;
    }
    const reason = validate(value);
    if (reason) return `"${key}" ${reason}`;
  }
  return null;
}
