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

test("decodes UTF-8 with a byte order mark", () => {
  const file = write(repoRoot, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{ "mode": "stat" }')]));
  assert.deepEqual(loadConfigFile(file), { mode: "stat" });
});

test("decodes UTF-16LE with a byte order mark (Windows PowerShell 5.1 redirection)", () => {
  const file = write(homeDir, Buffer.from('\uFEFF{"mode":"stat"}\r\n', "utf16le"));
  assert.deepEqual(loadConfigFile(file), { mode: "stat" });
});

test("decodes UTF-16BE with a byte order mark", () => {
  const file = write(homeDir, Buffer.from('\uFEFF{"mode":"stat"}', "utf16le").swap16());
  assert.deepEqual(loadConfigFile(file), { mode: "stat" });
});

test("reads plain UTF-8 with non-ASCII text", () => {
  const file = write(repoRoot, '{ "exclude": ["docs/açúcar/**"] }');
  assert.deepEqual(loadConfigFile(file), { exclude: ["docs/açúcar/**"] });
});
