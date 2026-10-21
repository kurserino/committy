import { spawnSync } from "child_process";
import { buildPathspec } from "./pathspec.js";
import { gitError, runGitAndCapture } from "./run.js";

export function ensureGitRepository() {
  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    encoding: "utf-8",
  });

  if (result.error) {
    throw result.error;
  }

  // Prints "false" inside the .git directory, fails outside any repository
  if (result.status !== 0 || (result.stdout || "").trim() !== "true") {
    throw new Error("Not a git repository. Run committy inside a git work tree.");
  }
}

export function hasStagedChanges({ dir, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const args = ["diff", "--cached", "--quiet", "--", ...pathspec];
  const result = spawnSync("git", args, { encoding: "utf-8" });

  if (result.error) {
    throw result.error;
  }

  if (result.status === 0) {
    return false;
  }

  if (result.status === 1) {
    return true;
  }

  throw gitError(result, args);
}

export function getUnstagedFileNames({ dir, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const unstagedTracked = runGitAndCapture(["diff", "--name-only", "--", ...pathspec]);
  const untracked = runGitAndCapture([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    ...pathspec,
  ]);

  return Array.from(
    new Set(
      `${unstagedTracked}\n${untracked}`
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
  );
}
