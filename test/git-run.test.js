import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "fs";
import { createRepo, createTempDir, isolateGitConfig } from "./helpers/repo.js";
import { gitError, runGitAndCapture } from "../src/git/run.js";

let repo;
const originalCwd = process.cwd();

before(() => {
  repo = createRepo();
  process.chdir(repo.dir);
});

after(() => {
  process.chdir(originalCwd);
  repo.cleanup();
});

test("returns git stdout", () => {
  assert.equal(runGitAndCapture(["config", "user.name"]).trim(), "Committy Test");
});

test("ignores empty arguments", () => {
  assert.equal(runGitAndCapture(["config", "", "user.name"]).trim(), "Committy Test");
});

test("throws with git stderr on non-zero exit", () => {
  assert.throws(() => runGitAndCapture(["checkout", "does-not-exist"]), /does-not-exist/);
});

// Outside a repo `git diff --cached` falls back to --no-index mode, so git reports
// "unknown option `cached'" instead of "not a git repository"
test("throws a git error outside a repository", () => {
  const outside = createTempDir();
  isolateGitConfig(outside);
  process.chdir(outside);
  try {
    assert.throws(() => runGitAndCapture(["diff", "--cached"]), /unknown option `cached'|not a git repository/i);
  } finally {
    process.chdir(repo.dir);
    rmSync(outside, { recursive: true, force: true });
  }
});

test("gitError prefers stderr, then stdout, then a generic message", () => {
  assert.equal(gitError({ stderr: " boom \n", stdout: "out" }, ["x"]).message, "boom");
  assert.equal(gitError({ stderr: "", stdout: "out" }, ["x"]).message, "out");
  assert.equal(
    gitError({ stderr: "", stdout: "" }, ["diff", "--cached"]).message,
    "Git command failed: git diff --cached"
  );
});
