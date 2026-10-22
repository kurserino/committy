import { getStagedDiff, getStagedNamesOnly, getStagedStat } from "../git/diff.js";

const TRUNCATED_MARKER = "\n[truncated]\n";
const MIN_FILE_CHARS = 400;
// Past these sizes extra diff adds cost, not information: the start of a file names the change
const PARTIAL_MAX_CHARS = 12000;
const PARTIAL_FILE_MAX_CHARS = 3000;

export function stripInputHeader(inputText) {
  return inputText
    .replace(/^(DIFF_U0|DIFF_PARTIAL|DIFF_STAT|FILENAMES)\n/, "")
    .trim();
}

// Cuts one file's diff to `budget` chars at a hunk boundary (else a line boundary),
// or returns null when not even the header and a first hunk line fit
function truncateFileDiff(fileDiff, budget) {
  if (fileDiff.length <= budget) return fileDiff;
  // A budget below the marker length would make the slice below count from the end
  if (budget <= TRUNCATED_MARKER.length) return null;
  const room = fileDiff.slice(0, budget - TRUNCATED_MARKER.length);
  const firstHunk = room.indexOf("\n@@");
  if (firstHunk === -1) return null;
  const lastHunk = room.lastIndexOf("\n@@");
  const kept = lastHunk > firstHunk ? room.slice(0, lastHunk) : room.slice(0, room.lastIndexOf("\n"));
  return kept.length > firstHunk ? kept + TRUNCATED_MARKER : null;
}

// Full stat plus the U0 diff cut per file so one huge file cannot hide the others.
// Returns null when the stat leaves no room for any diff content
function buildPartialInput(stat, u0, maxChars) {
  maxChars = Math.min(maxChars, PARTIAL_MAX_CHARS);
  const head = `DIFF_PARTIAL\n${stat}\n`;
  if (!stat.trim() || head.length > maxChars / 2) return null;

  const files = u0.split(/^(?=diff --git )/m);
  let remaining = maxChars - head.length;
  let body = "";
  files.forEach((fileDiff, i) => {
    // Space a small file leaves unused flows to the files after it
    const share = Math.max(MIN_FILE_CHARS, Math.floor(remaining / (files.length - i)));
    const budget = Math.min(remaining, share, PARTIAL_FILE_MAX_CHARS);
    const piece = truncateFileDiff(fileDiff, budget);
    if (!piece) return;
    body += piece;
    remaining -= piece.length;
  });
  return body ? head + body : null;
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

  // auto mode: try U0; then stat plus a per-file truncated U0; then stat; then names
  let tooBigU0 = "";
  try {
    const u0 = getStagedDiff({ dir, unified: 0, excludes: ex });
    if (u0.trim() && u0.length <= maxChars) return `DIFF_U0\n${u0}`;
    tooBigU0 = u0;
  } catch {
    // ignore and fall through
  }
  try {
    const stat = getStagedStat({ dir, excludes: ex });
    const partial = tooBigU0.trim() && buildPartialInput(stat, tooBigU0, maxChars);
    if (partial) return partial;
    if (stat.trim()) return `DIFF_STAT\n${stat}`.slice(0, maxChars);
  } catch {
    // ignore
  }
  const names = getStagedNamesOnly({ dir, excludes: ex });
  return `FILENAMES\n${names}`.slice(0, maxChars);
}
