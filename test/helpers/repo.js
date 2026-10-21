import { spawnSync } from "child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// Isolate git from the developer's global/system config (hooks, signing, templates)
export function isolateGitConfig(baseDir) {
  const globalConfig = path.join(baseDir, "gitconfig");
  writeFileSync(globalConfig, "");
  process.env.GIT_CONFIG_GLOBAL = globalConfig;
  process.env.GIT_CONFIG_NOSYSTEM = "1";
}

export function createTempDir() {
  return realpathSync(mkdtempSync(path.join(tmpdir(), "committy-test-")));
}

// Creates a temporary git repository with a deterministic config
export function createRepo() {
  const baseDir = createTempDir();
  isolateGitConfig(baseDir);
  const dir = path.join(baseDir, "repo");
  mkdirSync(dir);

  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf-8" });
    if (result.status !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    }
    return result.stdout;
  };

  git("init", "-q");
  git("config", "user.name", "Committy Test");
  git("config", "user.email", "test@committy.dev");
  git("config", "commit.gpgsign", "false");
  git("config", "core.autocrlf", "false");

  const write = (relPath, content) => {
    const fullPath = path.join(dir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
    return fullPath;
  };

  const commitAll = (message = "initial") => {
    git("add", "-A");
    git("commit", "-q", "-m", message);
  };

  const cleanup = () => rmSync(baseDir, { recursive: true, force: true });

  return { dir, baseDir, git, write, commitAll, cleanup };
}

// Builds a file with numbered lines, useful to check diff context size
export const numberedLines = (count, changedLine = -1) =>
  Array.from({ length: count }, (_, i) =>
    i + 1 === changedLine ? `changed ${i + 1}` : `line ${i + 1}`
  ).join("\n") + "\n";
