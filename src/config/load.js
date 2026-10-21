import { readFileSync } from "fs";
import path from "path";
import { validateConfig } from "./schema.js";

export const CONFIG_FILE_NAME = ".committy";

const invalid = (file, reason) => new Error(`Invalid config file ${file}: ${reason}`);

// Reads and validates one config file; a missing file is an empty config
export function loadConfigFile(file) {
  let text;
  try {
    text = readFileSync(file, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw invalid(file, err.message);
  }

  let config;
  try {
    config = JSON.parse(text);
  } catch (err) {
    throw invalid(file, err.message);
  }

  const reason = validateConfig(config);
  if (reason) throw invalid(file, reason);
  return config;
}

// Project file at the repository root and user file in the home directory;
// when both are the same file it is read once, as the project file
export function loadConfigFiles({ repoRoot, homeDir }) {
  const projectFile = path.resolve(repoRoot, CONFIG_FILE_NAME);
  const userFile = homeDir ? path.resolve(homeDir, CONFIG_FILE_NAME) : null;
  return {
    project: loadConfigFile(projectFile),
    user: userFile && userFile !== projectFile ? loadConfigFile(userFile) : {},
  };
}
