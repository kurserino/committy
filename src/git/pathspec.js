import path from "path";

export function buildPathspec(dir, excludes) {
  const rawRoot = dir && dir.trim() ? dir : ".";
  // Ensure pathspec root is relative to current working directory and uses POSIX separators
  const relativeRoot = path.isAbsolute(rawRoot)
    ? path.relative(process.cwd(), rawRoot)
    : rawRoot;
  const normalizedRoot = relativeRoot && relativeRoot !== "" ? relativeRoot : ".";
  const gitRoot = normalizedRoot.split(path.sep).join("/");
  // Return as array to avoid shell quoting issues on Windows/PowerShell
  return [gitRoot, ...excludes.map((p) => `:(exclude)${p}`)];
}
