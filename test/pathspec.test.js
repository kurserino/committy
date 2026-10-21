import { test } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { buildPathspec } from "../src/git/pathspec.js";

test("defaults root to '.' when no dir is given", () => {
  assert.deepEqual(buildPathspec("", []), ["."]);
  assert.deepEqual(buildPathspec(undefined, []), ["."]);
  assert.deepEqual(buildPathspec("   ", []), ["."]);
});

test("keeps a relative dir as given", () => {
  assert.deepEqual(buildPathspec("src", []), ["src"]);
});

test("converts absolute dir to a path relative to cwd", () => {
  const abs = path.join(process.cwd(), "src", "git");
  assert.deepEqual(buildPathspec(abs, []), ["src/git"]);
});

test("uses '.' when the absolute dir is the cwd", () => {
  assert.deepEqual(buildPathspec(process.cwd(), []), ["."]);
});

test("uses POSIX separators in the pathspec root", () => {
  const abs = path.join(process.cwd(), "a", "b", "c");
  const [root] = buildPathspec(abs, []);
  assert.equal(root, "a/b/c");
  assert.ok(!root.includes("\\"));
});

test("appends excludes as git exclude pathspecs", () => {
  assert.deepEqual(buildPathspec("src", ["*.lock", "dist/**"]), [
    "src",
    ":(exclude)*.lock",
    ":(exclude)dist/**",
  ]);
});

test("passes pathspecs that already carry magic through unchanged", () => {
  assert.deepEqual(buildPathspec("", [":(exclude,glob)**/dist/**", "*.md"]), [
    ".",
    ":(exclude,glob)**/dist/**",
    ":(exclude)*.md",
  ]);
});
