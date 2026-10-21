import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSettings } from "../src/config/resolve.js";
import { DEFAULT_EXCLUDE_PATHSPECS } from "../src/config/defaults.js";

test("built-in defaults with no layers", () => {
  assert.deepEqual(resolveSettings({}), {
    model: "gpt-5",
    mode: "auto",
    maxInputChars: 48000,
    dryRun: false,
    style: "conventional",
    oneLine: true,
    excludes: DEFAULT_EXCLUDE_PATHSPECS,
  });
});

test("user file applies when nothing else sets the value", () => {
  const s = resolveSettings({ user: { model: "gpt-5-mini", mode: "names", maxInputChars: 100 } });
  assert.equal(s.model, "gpt-5-mini");
  assert.equal(s.mode, "names");
  assert.equal(s.maxInputChars, 100);
});

test("project file overrides user file", () => {
  const s = resolveSettings({ user: { mode: "names" }, project: { mode: "stat" } });
  assert.equal(s.mode, "stat");
});

test("flag overrides both files", () => {
  const s = resolveSettings({
    flags: { mode: "full", maxInputChars: 500 },
    project: { mode: "stat", maxInputChars: 20000 },
    user: { mode: "stat" },
  });
  assert.equal(s.mode, "full");
  assert.equal(s.maxInputChars, 500);
});

test("an unpassed flag does not hide config", () => {
  const s = resolveSettings({ flags: { maxInputChars: undefined }, project: { maxInputChars: 20000 } });
  assert.equal(s.maxInputChars, 20000);
});

test("maxInputChars given as a string is converted", () => {
  assert.equal(resolveSettings({ flags: { maxInputChars: "60" } }).maxInputChars, 60);
});

test("COMMITTY_MODEL overrides files but not the flag", () => {
  const layers = { env: { COMMITTY_MODEL: "gpt-4o" }, project: { model: "gpt-5-mini" } };
  assert.equal(resolveSettings(layers).model, "gpt-4o");
  assert.equal(resolveSettings({ ...layers, flags: { model: "o3" } }).model, "o3");
});

test("an empty COMMITTY_MODEL is treated as unset", () => {
  const s = resolveSettings({ env: { COMMITTY_MODEL: "" }, user: { model: "gpt-5-mini" } });
  assert.equal(s.model, "gpt-5-mini");
});

test("dryRun from config, overridden by --no-dry-run", () => {
  assert.equal(resolveSettings({ user: { dryRun: true } }).dryRun, true);
  assert.equal(resolveSettings({ flags: { dryRun: false }, user: { dryRun: true } }).dryRun, false);
  assert.equal(resolveSettings({ flags: { dryRun: true } }).dryRun, true);
});

test("defaultExcludes false in config drops the defaults; the flag re-enables them", () => {
  assert.deepEqual(resolveSettings({ project: { defaultExcludes: false } }).excludes, []);
  assert.deepEqual(
    resolveSettings({ flags: { defaultExcludes: true }, project: { defaultExcludes: false } }).excludes,
    DEFAULT_EXCLUDE_PATHSPECS
  );
  assert.deepEqual(
    resolveSettings({ project: { defaultExcludes: true }, user: { defaultExcludes: false } }).excludes,
    DEFAULT_EXCLUDE_PATHSPECS
  );
});

test("excludes accumulate across layers, config patterns relative to the root", () => {
  const s = resolveSettings({
    user: { exclude: ["*.pdf"] },
    project: { exclude: ["generated/**", ":(exclude,glob)**/*.svg"] },
    flags: { exclude: ["docs/**"] },
  });
  assert.deepEqual(s.excludes, [
    ...DEFAULT_EXCLUDE_PATHSPECS,
    ":(top,exclude)*.pdf",
    ":(top,exclude)generated/**",
    ":(exclude,glob)**/*.svg",
    "docs/**",
  ]);
});

test("style follows flag > project > user > default", () => {
  assert.equal(resolveSettings({ user: { style: "gitmoji" } }).style, "gitmoji");
  assert.equal(resolveSettings({ user: { style: "gitmoji" }, project: { style: "auto" } }).style, "auto");
  assert.equal(
    resolveSettings({ flags: { style: "simple" }, user: { style: "gitmoji" } }).style,
    "simple"
  );
});

test("oneLine from config, overridden by --one-line", () => {
  assert.equal(resolveSettings({ user: { oneLine: false } }).oneLine, false);
  assert.equal(resolveSettings({ flags: { oneLine: true }, user: { oneLine: false } }).oneLine, true);
  assert.equal(resolveSettings({ flags: { oneLine: false } }).oneLine, false);
});
