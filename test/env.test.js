import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const { installEnvFile, loadEnv } = await import("../src/env.js");

test("the .env is looked up next to committy's package.json, not in the cwd", () => {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  assert.equal(installEnvFile, path.join(packageRoot, ".env"));
});

test("loadEnv reads variables from the given file without overriding existing ones", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "committy-env-"));
  const file = path.join(dir, ".env");
  writeFileSync(file, "COMMITTY_TEST_NEW=from-file\nCOMMITTY_TEST_SET=from-file\n");
  process.env.COMMITTY_TEST_SET = "from-env";
  t.after(() => {
    delete process.env.COMMITTY_TEST_NEW;
    delete process.env.COMMITTY_TEST_SET;
    rmSync(dir, { recursive: true, force: true });
  });

  loadEnv(file);
  assert.equal(process.env.COMMITTY_TEST_NEW, "from-file");
  assert.equal(process.env.COMMITTY_TEST_SET, "from-env");
});

test("loadEnv ignores a missing file", () => {
  assert.doesNotThrow(() => loadEnv(path.join(tmpdir(), "committy-no-such-dir", ".env")));
});
