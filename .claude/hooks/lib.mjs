import { execFileSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

export const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
export const driftMarker = path.join(projectDir, "openspec", ".last-drift-check");

export function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf-8") || "{}");
  } catch {
    return {};
  }
}

// Injects text into Claude's context for the given hook event
export function addContext(hookEventName, text) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: text } })
  );
}

export function activeChanges() {
  const dir = path.join(projectDir, "openspec", "changes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "archive")
    .map((d) => d.name);
}

export function git(...args) {
  return execFileSync("git", args, { cwd: projectDir, encoding: "utf-8" }).trim();
}
