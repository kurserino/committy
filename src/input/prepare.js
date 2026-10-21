import { getStagedDiff, getStagedNamesOnly, getStagedStat } from "../git/diff.js";

export function stripInputHeader(inputText) {
  return inputText
    .replace(/^(DIFF_U0|DIFF_STAT|FILENAMES)\n/, "")
    .trim();
}

export function prepareInputForModel({ mode, dir, maxChars, excludes }) {
  // mode: auto | full | unified0 | stat | names
  const ex = excludes || [];
  if (mode === "full") {
    const full = getStagedDiff({ dir, unified: 3, excludes: ex });
    return full.length > maxChars ? full.slice(0, maxChars) : full;
  }
  if (mode === "unified0") {
    const u0 = getStagedDiff({ dir, unified: 0, excludes: ex });
    return u0.length > maxChars ? u0.slice(0, maxChars) : u0;
  }
  if (mode === "stat") {
    const stat = getStagedStat({ dir, excludes: ex });
    return `DIFF_STAT\n${stat}`.slice(0, maxChars);
  }
  if (mode === "names") {
    const names = getStagedNamesOnly({ dir, excludes: ex });
    return `FILENAMES\n${names}`.slice(0, maxChars);
  }

  // auto mode: try U0; fall back to stat; then names
  try {
    const u0 = getStagedDiff({ dir, unified: 0, excludes: ex });
    if (u0.trim() && u0.length <= maxChars) return `DIFF_U0\n${u0}`;
    // If still too big, fall through to stat
  } catch {
    // ignore and fall through
  }
  try {
    const stat = getStagedStat({ dir, excludes: ex });
    if (stat.trim()) return `DIFF_STAT\n${stat}`.slice(0, maxChars);
  } catch {
    // ignore
  }
  const names = getStagedNamesOnly({ dir, excludes: ex });
  return `FILENAMES\n${names}`.slice(0, maxChars);
}
