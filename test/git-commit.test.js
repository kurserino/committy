import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRepo } from "./helpers/repo.js";
import { runGitCommit } from "../src/git/commit.js";

let repo;
const originalCwd = process.cwd();

beforeEach(() => {
  repo = createRepo();
  repo.write("a.txt", "a\n");
  repo.commitAll();
  process.chdir(repo.dir);
});

afterEach(() => {
  process.chdir(originalCwd);
  repo.cleanup();
});

test("commits staged changes with the given message", () => {
  repo.write("a.txt", "changed\n");
  repo.git("add", "a.txt");
  runGitCommit("feat: change a");
  assert.equal(repo.git("log", "-1", "--format=%s").trim(), "feat: change a");
});

test("passes the message as a single argument without shell interpretation", () => {
  const message = `fix: handle "quotes", $HOME, \`ticks\` & pipes | ok`;
  repo.write("a.txt", "changed\n");
  repo.git("add", "a.txt");
  runGitCommit(message);
  assert.equal(repo.git("log", "-1", "--format=%s").trim(), message);
});

test("throws when git commit fails", () => {
  // Nothing staged, so git commit exits non-zero
  assert.throws(() => runGitCommit("chore: nothing"), /git commit failed/);
});
