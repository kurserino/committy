import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const configUrl = pathToFileURL(
  fileURLToPath(new URL("../src/config/defaults.js", import.meta.url))
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

test("DEFAULT_MODEL is gpt-5 and ignores COMMITTY_MODEL", () => {
  // COMMITTY_MODEL is its own settings layer, resolved at run time
  assert.equal(readDefaultModel({ ...process.env, COMMITTY_MODEL: "gpt-4o" }), "gpt-5");
});

test("default excludes cover lockfiles, build output, maps and env files", async () => {
  const { DEFAULT_EXCLUDES, DEFAULT_MAX_INPUT_CHARS } = await import("../src/config/defaults.js");
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

test("default exclude pathspecs match the defaults at any depth", async () => {
  const { DEFAULT_EXCLUDES, DEFAULT_EXCLUDE_PATHSPECS } = await import("../src/config/defaults.js");
  assert.equal(DEFAULT_EXCLUDE_PATHSPECS.length, DEFAULT_EXCLUDES.length);
  assert.ok(DEFAULT_EXCLUDE_PATHSPECS.includes(":(exclude,glob)**/package-lock.json"));
  assert.ok(DEFAULT_EXCLUDE_PATHSPECS.includes(":(exclude,glob)**/dist/**"));
});
