import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const configUrl = pathToFileURL(
  fileURLToPath(new URL("../src/config.js", import.meta.url))
).href;

function readDefaultModel(env) {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { DEFAULT_MODEL } from ${JSON.stringify(configUrl)}; console.log(DEFAULT_MODEL);`,
    ],
    { encoding: "utf-8", env }
  );
  return result.stdout.trim();
}

test("DEFAULT_MODEL falls back to gpt-5", () => {
  const env = { ...process.env };
  delete env.COMMITTY_MODEL;
  assert.equal(readDefaultModel(env), "gpt-5");
});

test("DEFAULT_MODEL reads COMMITTY_MODEL", () => {
  assert.equal(readDefaultModel({ ...process.env, COMMITTY_MODEL: "gpt-4o" }), "gpt-4o");
});

test("default excludes cover lockfiles, build output, maps and env files", async () => {
  const { DEFAULT_EXCLUDES, DEFAULT_MAX_INPUT_CHARS } = await import("../src/config.js");
  assert.deepEqual(DEFAULT_EXCLUDES, [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.lock",
    "node_modules/**",
    "dist/**",
    "build/**",
    "out/**",
    "coverage/**",
    "*.min.*",
    "*.map",
    "*.snap",
    ".env*",
  ]);
  assert.equal(DEFAULT_MAX_INPUT_CHARS, 48000);
});
