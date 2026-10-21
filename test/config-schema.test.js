import { test } from "node:test";
import assert from "node:assert/strict";
import { validateConfig } from "../src/config/schema.js";

test("accepts an empty object and every valid key", () => {
  assert.equal(validateConfig({}), null);
  assert.equal(
    validateConfig({
      model: "gpt-5-mini",
      mode: "stat",
      maxInputChars: 30000,
      exclude: ["docs/**", "*.pdf"],
      defaultExcludes: false,
      dryRun: true,
    }),
    null
  );
});

test("accepts every mode", () => {
  for (const mode of ["auto", "full", "unified0", "stat", "names"]) {
    assert.equal(validateConfig({ mode }), null);
  }
});

test("rejects a top level that is not an object", () => {
  for (const value of [null, ["stat"], "stat", 1, true]) {
    assert.equal(validateConfig(value), "expected a JSON object");
  }
});

test("rejects unknown keys by name", () => {
  assert.match(validateConfig({ modle: "gpt-4o" }), /unknown key "modle"/);
});

test("rejects credential and endpoint keys as unknown", () => {
  for (const key of ["apiKey", "baseURL", "OPENAI_API_KEY", "env"]) {
    assert.match(validateConfig({ [key]: "x" }), new RegExp(`unknown key "${key}"`));
  }
});

test("rejects invalid values naming the key", () => {
  const cases = [
    [{ model: "" }, /"model" must be a non-empty string/],
    [{ model: 5 }, /"model"/],
    [{ mode: "foo" }, /"mode" must be one of auto, full, unified0, stat, names/],
    [{ maxInputChars: 0 }, /"maxInputChars" must be a positive integer/],
    [{ maxInputChars: -1 }, /"maxInputChars"/],
    [{ maxInputChars: 1.5 }, /"maxInputChars"/],
    [{ maxInputChars: "30000" }, /"maxInputChars"/],
    [{ exclude: "docs/**" }, /"exclude" must be an array of non-empty strings/],
    [{ exclude: ["docs/**", ""] }, /"exclude"/],
    [{ exclude: [1] }, /"exclude"/],
    [{ defaultExcludes: "false" }, /"defaultExcludes" must be true or false/],
    [{ dryRun: 1 }, /"dryRun" must be true or false/],
  ];
  for (const [config, expected] of cases) {
    assert.match(validateConfig(config), expected, JSON.stringify(config));
  }
});
