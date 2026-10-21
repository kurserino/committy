import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { createTempDir } from "./helpers/repo.js";
import { loadConfigFile, loadConfigFiles } from "../src/config/load.js";

let base;
let repoRoot;
let homeDir;

beforeEach(() => {
  base = createTempDir();
  repoRoot = path.join(base, "repo");
  homeDir = path.join(base, "home");
  mkdirSync(repoRoot);
  mkdirSync(homeDir);
});

afterEach(() => rmSync(base, { recursive: true, force: true }));

const write = (dir, content) => {
  const file = path.join(dir, ".committy");
  writeFileSync(file, content);
  return file;
};

test("missing files are empty configs", () => {
  assert.deepEqual(loadConfigFiles({ repoRoot, homeDir }), { project: {}, user: {} });
});

test("reads the project and user files", () => {
  write(repoRoot, '{ "mode": "stat" }');
  write(homeDir, '{ "model": "gpt-5-mini" }');
  assert.deepEqual(loadConfigFiles({ repoRoot, homeDir }), {
    project: { mode: "stat" },
    user: { model: "gpt-5-mini" },
  });
});

test("reads a shared path once, as the project file", () => {
  write(repoRoot, '{ "mode": "names" }');
  assert.deepEqual(loadConfigFiles({ repoRoot, homeDir: repoRoot }), {
    project: { mode: "names" },
    user: {},
  });
});

test("malformed JSON names the file", () => {
  const file = write(repoRoot, '{ "mode": "stat",, }');
  assert.throws(
    () => loadConfigFiles({ repoRoot, homeDir }),
    (err) => err.message.startsWith(`Invalid config file ${file}: `)
  );
});

test("a top level that is not an object names the file", () => {
  const file = write(homeDir, '["stat"]');
  assert.throws(() => loadConfigFiles({ repoRoot, homeDir }), {
    message: `Invalid config file ${file}: expected a JSON object`,
  });
});

test("an unknown key names the file and the key", () => {
  const file = write(repoRoot, '{ "modle": "gpt-4o" }');
  assert.throws(() => loadConfigFile(file), (err) =>
    err.message.includes(file) && err.message.includes('"modle"')
  );
});

test("an invalid value names the file and the key", () => {
  const file = write(homeDir, '{ "maxInputChars": 0 }');
  assert.throws(() => loadConfigFiles({ repoRoot, homeDir }), {
    message: `Invalid config file ${file}: "maxInputChars" must be a positive integer`,
  });
});

test("a repository cannot set the API endpoint", () => {
  const file = write(repoRoot, '{ "baseURL": "http://attacker.example" }');
  assert.throws(() => loadConfigFile(file), (err) =>
    err.message.includes(file) && err.message.includes('"baseURL"')
  );
});

test("an unreadable path names the file", () => {
  const file = path.join(repoRoot, ".committy");
  mkdirSync(file);
  assert.throws(() => loadConfigFile(file), (err) =>
    err.message.startsWith(`Invalid config file ${file}: `)
  );
});
