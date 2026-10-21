import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { createRepo, numberedLines } from "./helpers/repo.js";
import { getStagedDiff, getStagedNamesOnly, getStagedStat } from "../src/git/diff.js";

let repo;
const originalCwd = process.cwd();

beforeEach(() => {
  repo = createRepo();
  repo.write("file.txt", numberedLines(20));
  repo.write("old-name.txt", "content that will be renamed\nwith a few lines\nof text\n");
  repo.write("gone.txt", "to be deleted\n");
  repo.commitAll();
  process.chdir(repo.dir);
});

afterEach(() => {
  process.chdir(originalCwd);
  repo.cleanup();
});

test("getStagedDiff with 3 lines of context includes surrounding lines", () => {
  repo.write("file.txt", numberedLines(20, 10));
  repo.git("add", "file.txt");
  const diff = getStagedDiff({ dir: "", unified: 3, excludes: [] });
  assert.match(diff, /\+changed 10/);
  assert.match(diff, /^ line 7$/m);
  assert.match(diff, /^ line 13$/m);
});

test("getStagedDiff with 0 lines of context has only changed lines", () => {
  repo.write("file.txt", numberedLines(20, 10));
  repo.git("add", "file.txt");
  const diff = getStagedDiff({ dir: "", unified: 0, excludes: [] });
  assert.match(diff, /^-line 10$/m);
  assert.match(diff, /^\+changed 10$/m);
  assert.doesNotMatch(diff, /^ line 9$/m);
});

test("getStagedDiff ignores unstaged changes", () => {
  repo.write("file.txt", numberedLines(20, 10));
  assert.equal(getStagedDiff({ dir: "", unified: 0, excludes: [] }), "");
});

test("getStagedDiff detects renames", () => {
  repo.git("mv", "old-name.txt", "new-name.txt");
  const diff = getStagedDiff({ dir: "", unified: 0, excludes: [] });
  assert.match(diff, /rename from old-name\.txt/);
  assert.match(diff, /rename to new-name\.txt/);
});

test("getStagedDiff does not use an external diff tool", () => {
  repo.git("config", "diff.external", "false");
  repo.write("file.txt", numberedLines(20, 10));
  repo.git("add", "file.txt");
  assert.match(getStagedDiff({ dir: "", unified: 0, excludes: [] }), /\+changed 10/);
});

test("getStagedDiff applies excludes", () => {
  repo.write("file.txt", numberedLines(20, 10));
  repo.write("package-lock.json", "{}\n");
  repo.git("add", "-A");
  const diff = getStagedDiff({ dir: "", unified: 0, excludes: ["package-lock.json"] });
  assert.match(diff, /file\.txt/);
  assert.doesNotMatch(diff, /package-lock\.json/);
});

test("getStagedDiff is scoped to the given directory", () => {
  repo.write("src/a.js", "a\n");
  repo.write("other/b.js", "b\n");
  repo.git("add", "-A");
  const diff = getStagedDiff({ dir: path.join(repo.dir, "src"), unified: 0, excludes: [] });
  assert.match(diff, /src\/a\.js/);
  assert.doesNotMatch(diff, /other\/b\.js/);
});

test("getStagedStat summarizes staged files", () => {
  repo.write("file.txt", numberedLines(20, 10));
  repo.git("add", "file.txt");
  const stat = getStagedStat({ dir: "", excludes: [] });
  assert.match(stat, /file\.txt \| 2 \+-/);
  assert.match(stat, /1 file changed/);
});

test("getStagedNamesOnly lists added, modified and renamed files but not deleted ones", () => {
  repo.write("file.txt", numberedLines(20, 10));
  repo.write("added.txt", "new\n");
  repo.git("mv", "old-name.txt", "new-name.txt");
  repo.git("rm", "-q", "gone.txt");
  repo.git("add", "-A");
  const names = getStagedNamesOnly({ dir: "", excludes: [] }).trim().split("\n").sort();
  assert.deepEqual(names, ["added.txt", "file.txt", "new-name.txt"]);
});
