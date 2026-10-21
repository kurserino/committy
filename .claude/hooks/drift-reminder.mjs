// SessionStart: remind Claude to run the drift check when code changed since the last one
import { existsSync, readFileSync } from "fs";
import { addContext, driftMarker, git } from "./lib.mjs";

let message;
try {
  if (!existsSync(driftMarker)) {
    message = "No spec drift check has been recorded yet (openspec/.last-drift-check is missing).";
  } else {
    const last = readFileSync(driftMarker, "utf-8").trim();
    const commits = git("rev-list", "--count", `${last}..HEAD`, "--", "src", "bin");
    if (Number(commits) > 0) {
      message = `${commits} commit(s) changed src/ or bin/ since the last spec drift check (${last.slice(0, 7)}).`;
    }
  }
} catch {
  // Unknown marker commit (e.g. rewritten history): ask for a fresh check
  message = "The last spec drift check points to a commit that is no longer in history.";
}

if (message) {
  addContext(
    "SessionStart",
    `${message} Before starting new feature work, offer the user to run the spec-drift skill.`
  );
}
