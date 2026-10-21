import { buildPathspec } from "./pathspec.js";
import { runGitAndCapture } from "./run.js";

export function getStagedDiff({ dir, unified, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const u = typeof unified === "number" ? `-U${unified}` : "";
  const args = [
    "diff",
    "--cached",
    u,
    "--no-ext-diff",
    "--find-renames",
    "--",
    ...pathspec,
  ];
  return runGitAndCapture(args);
}

export function getStagedStat({ dir, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const args = [
    "diff",
    "--cached",
    "--stat",
    "--no-ext-diff",
    "--find-renames",
    "--",
    ...pathspec,
  ];
  return runGitAndCapture(args);
}

export function getStagedNamesOnly({ dir, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const args = [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMRT",
    "--",
    ...pathspec,
  ];
  return runGitAndCapture(args);
}
