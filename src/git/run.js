import { spawnSync } from "child_process";

export function runGitAndCapture(args) {
  const result = spawnSync("git", args.filter(Boolean), {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw gitError(result, args);
  }
  return (result.stdout || "").toString();
}

export function gitError(result, args) {
  const stderr = (result.stderr || "").toString();
  const stdout = (result.stdout || "").toString();
  const details = stderr.trim() || stdout.trim();
  return new Error(details || `Git command failed: git ${args.join(" ")}`);
}
