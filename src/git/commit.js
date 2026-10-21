import { spawnSync } from "child_process";

// Run git commit with generated message
export function runGitCommit(message) {
  // Avoid shell quoting issues by passing args array
  const result = spawnSync("git", ["commit", "-m", message], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error("git commit failed");
  }
}
