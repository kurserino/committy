import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "fs";
import path from "path";
import { createRepo, createTempDir, isolateGitConfig } from "./helpers/repo.js";
import {
  ensureGitRepository,
  getRepositoryRoot,
  getUnstagedFileNames,
  hasStagedChanges,
} from "../src/git/status.js";
import { DEFAULT_EXCLUDES } from "../src/config/defaults.js";

let repo;
const originalCwd = process.cwd();

beforeEach(() => {
  repo = createRepo();
  repo.write("README.md", "hello\n");
  repo.commitAll();
  process.chdir(repo.dir);
});

afterEach(() => {
  process.chdir(originalCwd);
  repo.cleanup();
});

test("hasStagedChanges is false when nothing is staged", () => {
  repo.write("README.md", "changed but not staged\n");
  assert.equal(hasStagedChanges({ dir: "", excludes: [] }), false);
});

test("hasStagedChanges is true when a file is staged", () => {
  repo.write("src/a.js", "a\n");
  repo.git("add", "src/a.js");
  assert.equal(hasStagedChanges({ dir: "", excludes: [] }), true);
});

test("hasStagedChanges works in a repo without commits", () => {
  const fresh = createRepo();
  try {
    process.chdir(fresh.dir);
    assert.equal(hasStagedChanges({ dir: "", excludes: [] }), false);
    fresh.write("a.txt", "a\n");
    fresh.git("add", "a.txt");
    assert.equal(hasStagedChanges({ dir: "", excludes: [] }), true);
  } finally {
    process.chdir(repo.dir);
    fresh.cleanup();
  }
});

test("hasStagedChanges ignores files matching excludes", () => {
  repo.write("yarn.lock", "lock\n");
  repo.write("dist/bundle.js", "x\n");
  repo.git("add", "-A");
  assert.equal(hasStagedChanges({ dir: "", excludes: DEFAULT_EXCLUDES }), false);
  assert.equal(hasStagedChanges({ dir: "", excludes: [] }), true);
});

test("hasStagedChanges is scoped to the given directory", () => {
  repo.write("other/b.js", "b\n");
  repo.git("add", "-A");
  const srcDir = path.join(repo.dir, "src");
  assert.equal(hasStagedChanges({ dir: srcDir, excludes: [] }), false);
  assert.equal(hasStagedChanges({ dir: path.join(repo.dir, "other"), excludes: [] }), true);
});

test("hasStagedChanges throws outside a git repository", () => {
  const outside = createTempDir();
  isolateGitConfig(outside);
  process.chdir(outside);
  try {
    assert.throws(() => hasStagedChanges({ dir: "", excludes: [] }), /unknown option `cached'|not a git repository/i);
  } finally {
    process.chdir(repo.dir);
    rmSync(outside, { recursive: true, force: true });
  }
});

test("getUnstagedFileNames lists modified and untracked files once", () => {
  repo.write("README.md", "modified\n");
  repo.write("new.txt", "new\n");
  assert.deepEqual(getUnstagedFileNames({ dir: "", excludes: [] }).sort(), [
    "README.md",
    "new.txt",
  ]);
});

test("getUnstagedFileNames skips gitignored and excluded files", () => {
  repo.write(".gitignore", "ignored.txt\n");
  repo.commitAll("add gitignore");
  repo.write("ignored.txt", "x\n");
  repo.write("pnpm-lock.yaml", "x\n");
  repo.write("app.js", "x\n");
  assert.deepEqual(getUnstagedFileNames({ dir: "", excludes: DEFAULT_EXCLUDES }), ["app.js"]);
});

test("getUnstagedFileNames does not list staged files", () => {
  repo.write("staged.txt", "x\n");
  repo.git("add", "staged.txt");
  assert.deepEqual(getUnstagedFileNames({ dir: "", excludes: [] }), []);
});

test("getUnstagedFileNames is scoped to the given directory", () => {
  repo.write("src/a.js", "a\n");
  repo.write("other/b.js", "b\n");
  assert.deepEqual(
    getUnstagedFileNames({ dir: path.join(repo.dir, "src"), excludes: [] }),
    ["src/a.js"]
  );
});

test("ensureGitRepository passes inside the work tree and its subdirectories", () => {
  assert.doesNotThrow(() => ensureGitRepository());
  repo.write("src/a.js", "a\n");
  process.chdir(path.join(repo.dir, "src"));
  assert.doesNotThrow(() => ensureGitRepository());
});

test("ensureGitRepository fails inside the .git directory", () => {
  process.chdir(path.join(repo.dir, ".git"));
  assert.throws(() => ensureGitRepository(), /^Error: Not a git repository\. Run committy inside a git work tree\.$/);
});

test("ensureGitRepository fails outside a repository", () => {
  const outside = createTempDir();
  isolateGitConfig(outside);
  process.chdir(outside);
  try {
    assert.throws(() => ensureGitRepository(), /^Error: Not a git repository/);
  } finally {
    process.chdir(repo.dir);
    rmSync(outside, { recursive: true, force: true });
  }
});

test("getRepositoryRoot returns the work tree root from a subdirectory", () => {
  repo.write("packages/app/index.js", "x\n");
  process.chdir(path.join(repo.dir, "packages", "app"));
  assert.equal(getRepositoryRoot(), repo.dir);
});
