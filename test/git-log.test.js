import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRepo } from "./helpers/repo.js";
import { getRecentSubjects } from "../src/git/log.js";

let repo;
const originalCwd = process.cwd();

beforeEach(() => {
  repo = createRepo();
  process.chdir(repo.dir);
});

afterEach(() => {
  process.chdir(originalCwd);
  repo.cleanup();
});

const commit = (file, subject) => {
  repo.write(file, `${subject}\n`);
  repo.commitAll(subject);
};

test("returns the most recent subjects first, up to the limit", () => {
  commit("a.txt", "feat: one");
  commit("b.txt", "✨ two");
  commit("c.txt", "Add three");
  assert.deepEqual(getRecentSubjects(2), ["Add three", "✨ two"]);
  assert.deepEqual(getRecentSubjects(20), ["Add three", "✨ two", "feat: one"]);
});

test("skips merge commits", () => {
  commit("a.txt", "feat: base");
  repo.git("switch", "-q", "-c", "topic");
  commit("b.txt", "feat: topic");
  repo.git("switch", "-q", "-");
  commit("c.txt", "feat: main");
  repo.git("merge", "-q", "--no-ff", "-m", "Merge branch topic", "topic");
  assert.deepEqual(getRecentSubjects(20).sort(), ["feat: base", "feat: main", "feat: topic"]);
});

test("returns an empty list in a repository without commits", () => {
  assert.deepEqual(getRecentSubjects(20), []);
});
