import { spawnSync } from "child_process";

// Subjects of the most recent non-merge commits; empty when there are no commits yet
export function getRecentSubjects(limit) {
  const result = spawnSync("git", ["log", "-n", String(limit), "--no-merges", "--format=%s"], {
    encoding: "utf-8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) return [];
  return (result.stdout || "").split("\n").filter((line) => line.trim());
}
