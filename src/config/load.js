import { readFileSync } from "fs";
import path from "path";
import { validateConfig } from "./schema.js";

export const CONFIG_FILE_NAME = ".committy";

const invalid = (file, reason) => new Error(`Invalid config file ${file}: ${reason}`);

// Decodes by byte order mark: Windows editors and PowerShell 5.1 redirection
// write UTF-8 or UTF-16 with a BOM; anything without one is read as UTF-8
function decode(bytes) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return bytes.subarray(3).toString("utf-8");
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return bytes.subarray(2).toString("utf16le");
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return Buffer.from(bytes.subarray(2)).swap16().toString("utf16le");
  }
  return bytes.toString("utf-8");
}

// Reads and validates one config file; a missing file is an empty config
export function loadConfigFile(file) {
  let text;
  try {
    text = decode(readFileSync(file));
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
