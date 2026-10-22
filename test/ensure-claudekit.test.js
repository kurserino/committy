import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createTempDir } from "./helpers/repo.js";

const hook = fileURLToPath(new URL("../.claude/hooks/ensure-claudekit.mjs", import.meta.url));
const IDS = ["claudekit-core@claudekit", "claudekit-openspec@claudekit", "claudekit-diff@claudekit"];

// Runs the hook for `project` with a plugin file where each plugin in `ids` has the given install entry
function runHook({ project, install, ids = IDS }) {
  const configDir = createTempDir();
  if (install) {
    mkdirSync(path.join(configDir, "plugins"));
    const plugins = Object.fromEntries(ids.map((id) => [id, [install]]));
    writeFileSync(path.join(configDir, "plugins", "installed_plugins.json"), JSON.stringify({ plugins }));
  }
  const result = spawnSync(process.execPath, [hook], {
    encoding: "utf-8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir, CLAUDE_PROJECT_DIR: project },
  });
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : "";
}

test("warns when the plugin file does not exist", () => {
  assert.match(runHook({ project: createTempDir() }), /Missing claudekit plugins: claudekit-core@claudekit, claudekit-openspec@claudekit, claudekit-diff@claudekit/);
});

test("warns about claudekit-diff only when it is the one plugin missing", () => {
  const project = createTempDir();
  const warning = runHook({ project, install: { scope: "project", projectPath: project }, ids: IDS.slice(0, 2) });
  assert.match(warning, /Missing claudekit plugins: claudekit-diff@claudekit\. NOT active: \/diff panel at session start\./);
  assert.match(warning, /claude plugin install claudekit-diff@claudekit --scope project/);
  assert.doesNotMatch(warning, /commit-identity|OpenSpec|install claudekit-(core|openspec)/);
});

test("warns when the plugins are installed for another project only", () => {
  const warning = runHook({ project: createTempDir(), install: { scope: "project", projectPath: createTempDir() } });
  assert.match(warning, /Missing claudekit plugins/);
});

test("stays silent when the plugins are installed for this project", () => {
  const project = createTempDir();
  assert.equal(runHook({ project, install: { scope: "project", projectPath: project } }), "");
});

test("stays silent when the plugins are installed at user scope", () => {
  assert.equal(runHook({ project: createTempDir(), install: { scope: "user" } }), "");
});
