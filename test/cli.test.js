import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { createRepo, numberedLines } from "./helpers/repo.js";

process.env.COMMITTY_OPENAI_API_KEY ||= "sk-test";
const { commitAction } = await import("../src/cli.js");
const { DEFAULT_MODEL } = await import("../src/config/defaults.js");

const ANSI = /\x1b\[[0-9;]*m/g;

let repo;
let home;
let output;
const originalCwd = process.cwd();
const originalEnv = { ...process.env };

beforeEach((t) => {
  repo = createRepo();
  // Isolated home directory so the developer's ~/.committy is never read
  home = path.join(repo.baseDir, "home");
  mkdirSync(home);
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  delete process.env.COMMITTY_MODEL;
  repo.write("app.js", numberedLines(50));
  repo.commitAll();
  process.chdir(repo.dir);

  output = [];
  const capture = (...args) => output.push(args.join(" ").replace(ANSI, ""));
  t.mock.method(console, "log", capture);
  t.mock.method(console, "error", capture);
});

afterEach(() => {
  process.chdir(originalCwd);
  for (const name of ["HOME", "USERPROFILE", "COMMITTY_MODEL"]) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
  // Errors set process.exitCode; reset it so the test runner itself does not fail
  process.exitCode = undefined;
  repo.cleanup();
});

const assertFailed = () => assert.equal(process.exitCode, 1);
const assertNotFailed = () => assert.notEqual(process.exitCode, 1);

const printed = () => output.join("\n");

// Parsed options as commander gives them: an unpassed flag is absent
const defaults = (overrides = {}) => ({ ...overrides });

const writeProjectConfig = (config, relDir = "") =>
  writeFileSync(path.join(repo.dir, relDir, ".committy"), JSON.stringify(config));
const writeUserConfig = (config) =>
  writeFileSync(path.join(home, ".committy"), JSON.stringify(config));

function fakeDeps({ message = "feat: generated message", errors = [] } = {}) {
  const calls = { generate: [], commit: [] };
  return {
    calls,
    generateCommitMessage: async (args) => {
      calls.generate.push(args);
      if (errors.length) throw errors.shift();
      return message;
    },
    runGitCommit: (msg) => calls.commit.push(msg),
  };
}

const stageChange = () => {
  repo.write("app.js", numberedLines(50, 25));
  repo.git("add", "app.js");
};

test("generates the message and commits it", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);

  assert.equal(deps.calls.generate.length, 1);
  assert.match(deps.calls.generate[0].inputText, /^DIFF_U0\n[\s\S]*\+changed 25/);
  assert.deepEqual(deps.calls.commit, ["feat: generated message"]);
  assert.match(printed(), /Generating commit message\.\.\./);
  assert.match(printed(), /Generated message:\n*\s*\nfeat: generated message/);
  assert.match(printed(), /Committing changes\.\.\./);
  assertNotFailed();
});

test("dry run prints the message without committing", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ dryRun: true }), deps);

  assert.deepEqual(deps.calls.commit, []);
  assert.match(printed(), /feat: generated message/);
  assert.match(printed(), /\(Dry run: commit not executed\)/);
  assert.doesNotMatch(printed(), /Committing changes/);
});

test("uses the --model option when given", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ model: "gpt-4o" }), deps);
  assert.equal(deps.calls.generate[0].model, "gpt-4o");
});

test("uses the default model when --model is not given", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].model, DEFAULT_MODEL);
});

test("passes --mode to input preparation", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\napp.js\n");
});

test("uses auto mode when --mode is empty", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ mode: undefined }), deps);
  assert.match(deps.calls.generate[0].inputText, /^DIFF_U0\n/);
});

test("--max-input-chars caps the input and triggers the stat fallback", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ maxInputChars: "60" }), deps);
  const { inputText } = deps.calls.generate[0];
  assert.match(inputText, /^DIFF_STAT\n/);
  assert.ok(inputText.length <= 60);
});

test("reports nothing staged and suggests git add when there are unstaged changes", async () => {
  repo.write("app.js", "unstaged\n");
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);

  assert.equal(deps.calls.generate.length, 0);
  assert.match(printed(), /No staged changes found\./);
  assert.match(printed(), /You still have unstaged changes\. Run "git add \." and try again\./);
  assertNotFailed();
});

test("suggests git add with the directory the user typed", async () => {
  repo.write("src/a.js", "a\n");
  const deps = fakeDeps();
  await commitAction("./src", defaults(), deps);
  assert.match(printed(), /Run "git add \.\/src" and try again\./);
});

test("reports a clean working tree when there is nothing to add", async () => {
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate.length, 0);
  assert.match(printed(), /No staged changes found\./);
  assert.match(printed(), /Working tree is clean for the selected path\./);
  assertNotFailed();
});

test("only considers changes inside the given directory", async () => {
  repo.write("src/a.js", "a\n");
  repo.write("other/b.js", "b\n");
  repo.git("add", "-A");
  const deps = fakeDeps();
  await commitAction("src", defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
});

test("accepts an absolute directory", async () => {
  repo.write("src/a.js", "a\n");
  repo.git("add", "-A");
  const deps = fakeDeps();
  await commitAction(path.join(repo.dir, "src"), defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
});

test("treats a change staged only in excluded files as nothing staged", async () => {
  repo.write("package-lock.json", "{}\n");
  repo.git("add", "package-lock.json");
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate.length, 0);
  assert.match(printed(), /No staged changes found\./);
});

test("--no-default-excludes includes lock files", async () => {
  repo.write("package-lock.json", "{}\n");
  repo.git("add", "package-lock.json");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ defaultExcludes: false, mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\npackage-lock.json\n");
});

test("--exclude adds patterns on top of the defaults", async () => {
  repo.write("docs/guide.md", "doc\n");
  repo.write("yarn.lock", "lock\n");
  stageChange();
  repo.git("add", "-A");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ exclude: ["docs/**"], mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\napp.js\n");
});

test("stops when the prepared input is empty", async () => {
  repo.git("rm", "-q", "app.js");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate.length, 0);
  assert.match(printed(), /No staged changes to commit\./);
  assertNotFailed();
});

test("retries once with a stat summary when the API reports a TPM limit", async () => {
  stageChange();
  const deps = fakeDeps({
    errors: [new Error("Rate limit reached: tokens per min (TPM): Limit 30000, Requested 52000")],
  });
  await commitAction(undefined, defaults({ maxInputChars: "48000" }), deps);

  assert.equal(deps.calls.generate.length, 2);
  const retryInput = deps.calls.generate[1].inputText;
  assert.match(retryInput, /^DIFF_STAT\n/);
  assert.ok(retryInput.length <= 20000);
  assert.match(printed(), /Retrying with summary \(stat\)/);
  assert.deepEqual(deps.calls.commit, ["feat: generated message"]);
});

test("caps the retry input at --max-input-chars when it is below 20000", async () => {
  stageChange();
  const deps = fakeDeps({ errors: [new Error("TPM exceeded")] });
  await commitAction(undefined, defaults({ maxInputChars: "15" }), deps);
  assert.equal(deps.calls.generate[1].inputText.length, 15);
});

test("does not retry on other API errors and reports them", async () => {
  stageChange();
  const deps = fakeDeps({ errors: [new Error("401 Incorrect API key provided")] });
  await commitAction(undefined, defaults(), deps);

  assert.equal(deps.calls.generate.length, 1);
  assert.deepEqual(deps.calls.commit, []);
  assert.match(printed(), /Error: 401 Incorrect API key provided/);
  assertFailed();
});

test("reports an error when the retry also fails", async () => {
  stageChange();
  const deps = fakeDeps({
    errors: [new Error("tokens per min"), new Error("tokens per min again")],
  });
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate.length, 2);
  assert.match(printed(), /Error: tokens per min again/);
  assertFailed();
});

test("reports commit failures", async () => {
  stageChange();
  const deps = fakeDeps();
  deps.runGitCommit = () => {
    throw new Error("git commit failed");
  };
  await commitAction(undefined, defaults(), deps);
  assert.match(printed(), /Error: git commit failed/);
  assertFailed();
});

test("reports a clear error outside a git repository", async () => {
  process.chdir(repo.baseDir);
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(
    printed(),
    "Error: Not a git repository. Run committy inside a git work tree."
  );
  assert.doesNotMatch(printed(), /usage:/);
  assert.equal(deps.calls.generate.length, 0);
  assertFailed();
});

test("reports a clear error inside the .git directory", async () => {
  process.chdir(path.join(repo.dir, ".git"));
  await commitAction(undefined, defaults(), fakeDeps());
  assert.match(printed(), /Error: Not a git repository/);
  assertFailed();
});

test("works from a subdirectory of the repository", async () => {
  repo.write("src/a.js", "a\n");
  repo.git("add", "-A");
  process.chdir(path.join(repo.dir, "src"));
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ mode: "names" }), deps);
  // git prints paths relative to the repository root
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
  assertNotFailed();
});

test("checks the API key before running any git command", async () => {
  // Outside a repo: if git ran first, the error would be "Not a git repository"
  process.chdir(repo.baseDir);
  const deps = fakeDeps();
  deps.ensureApiKey = () => {
    throw new Error("Missing OPENAI_API_KEY (or COMMITTY_OPENAI_API_KEY). Please set it as an environment variable.");
  };
  await commitAction(undefined, defaults(), deps);
  assert.match(printed(), /^Error: Missing OPENAI_API_KEY/);
  assertFailed();
});

test("reports a missing directory before running git", async () => {
  let gitChecked = false;
  const deps = fakeDeps();
  deps.ensureGitRepository = () => {
    gitChecked = true;
  };
  await commitAction("./does-not-exist", defaults(), deps);
  assert.equal(printed(), "Error: Directory not found: ./does-not-exist");
  assert.equal(gitChecked, false);
  assert.equal(deps.calls.generate.length, 0);
  assertFailed();
});

test("accepts a directory that exists", async () => {
  repo.write("src/a.js", "a\n");
  repo.git("add", "-A");
  const deps = fakeDeps();
  await commitAction("./src", defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
  assertNotFailed();
});

test("default excludes apply at any depth", async () => {
  for (const file of [
    "package-lock.json",
    "web/package-lock.json",
    "packages/app/yarn.lock",
    "packages/app/dist/index.js",
    "dist/bundle.js",
    "web/node_modules/x/index.js",
    "web/app.min.js",
    "web/.env.local",
    "src/real.js",
  ]) {
    repo.write(file, "x\n");
  }
  repo.git("add", "-A", "--force");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/real.js\n");
});

test("--no-default-excludes also includes nested files", async () => {
  repo.write("web/package-lock.json", "{}\n");
  repo.git("add", "-A");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ defaultExcludes: false, mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nweb/package-lock.json\n");
});

// Config files (.committy in the repository root and in the home directory)

const stageFiles = (...files) => {
  for (const file of files) repo.write(file, `${file}\n`);
  repo.git("add", ...files);
};

test("no config files keeps flag and default behavior", async () => {
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].model, "gpt-5");
  assert.match(deps.calls.generate[0].inputText, /^DIFF_U0\n/);
  assert.deepEqual(deps.calls.commit, ["feat: generated message"]);
});

test("project file is found from a subdirectory", async () => {
  writeProjectConfig({ mode: "stat" });
  stageFiles("packages/app/index.js");
  process.chdir(path.join(repo.dir, "packages", "app"));
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.match(deps.calls.generate[0].inputText, /^DIFF_STAT\n/);
  assertNotFailed();
});

test("user file applies in any repository", async () => {
  writeUserConfig({ model: "gpt-5-mini" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].model, "gpt-5-mini");
});

test("project file overrides user file", async () => {
  writeUserConfig({ mode: "names" });
  writeProjectConfig({ mode: "stat" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.match(deps.calls.generate[0].inputText, /^DIFF_STAT\n/);
});

test("flag overrides both files", async () => {
  writeUserConfig({ mode: "stat" });
  writeProjectConfig({ mode: "stat" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ mode: "names" }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\napp.js\n");
});

test("an unpassed --max-input-chars does not hide the config value", async () => {
  writeProjectConfig({ maxInputChars: 60 });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  const { inputText } = deps.calls.generate[0];
  assert.match(inputText, /^DIFF_STAT\n/);
  assert.ok(inputText.length <= 60);
});

test("COMMITTY_MODEL overrides config files", async () => {
  process.env.COMMITTY_MODEL = "gpt-4o";
  writeProjectConfig({ model: "gpt-5-mini" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].model, "gpt-4o");
});

test("--model overrides COMMITTY_MODEL and config files", async () => {
  process.env.COMMITTY_MODEL = "gpt-4o";
  writeUserConfig({ model: "gpt-5-mini" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ model: "o3" }), deps);
  assert.equal(deps.calls.generate[0].model, "o3");
});

test("dryRun from a config file skips the commit", async () => {
  writeUserConfig({ dryRun: true });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.deepEqual(deps.calls.commit, []);
  assert.match(printed(), /\(Dry run: commit not executed\)/);
});

test("--no-dry-run forces the commit", async () => {
  writeUserConfig({ dryRun: true });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ dryRun: false }), deps);
  assert.deepEqual(deps.calls.commit, ["feat: generated message"]);
});

test("defaultExcludes false in the project file includes lock files", async () => {
  writeProjectConfig({ defaultExcludes: false, mode: "names" });
  stageFiles("package-lock.json");
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\npackage-lock.json\n");
});

test("--default-excludes re-enables the defaults", async () => {
  writeProjectConfig({ defaultExcludes: false, mode: "names" });
  stageFiles("package-lock.json", "src/a.js");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ defaultExcludes: true }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
});

test("excludes from both files and flags accumulate", async () => {
  writeUserConfig({ exclude: ["*.pdf"] });
  writeProjectConfig({ exclude: ["generated/**"], mode: "names" });
  stageFiles("manual.pdf", "generated/api.js", "docs/guide.md", "yarn.lock", "src/a.js");
  const deps = fakeDeps();
  await commitAction(undefined, defaults({ exclude: ["docs/**"] }), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
});

test("config excludes are relative to the repository root", async () => {
  writeProjectConfig({ exclude: ["generated/**"], mode: "names" });
  stageFiles("generated/api.js", "src/a.js");
  process.chdir(path.join(repo.dir, "src"));
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\nsrc/a.js\n");
});

test("mode from a config file applies without --mode", async () => {
  writeProjectConfig({ mode: "names" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate[0].inputText, "FILENAMES\napp.js\n");
});

test("an invalid config file fails before calling the API", async () => {
  writeProjectConfig({ modle: "gpt-4o" });
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate.length, 0);
  const file = path.join(repo.dir, ".committy");
  assert.ok(printed().startsWith(`Error: Invalid config file ${file}: unknown key "modle"`));
  assertFailed();
});

test("malformed JSON in the user file fails with its path", async () => {
  writeFileSync(path.join(home, ".committy"), '{ "mode": "stat",, }');
  stageChange();
  const deps = fakeDeps();
  await commitAction(undefined, defaults(), deps);
  assert.equal(deps.calls.generate.length, 0);
  assert.ok(printed().startsWith(`Error: Invalid config file ${path.join(home, ".committy")}: `));
  assertFailed();
});
