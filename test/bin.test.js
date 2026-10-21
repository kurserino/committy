import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "child_process";
import { readFileSync } from "fs";
import { createServer } from "http";
import { createRepo } from "./helpers/repo.js";
import { createPackageCopy } from "./helpers/package.js";

// End-to-end checks of the entrypoint, run from an isolated copy of the package
// so the developer's real .env is never read; they never reach the OpenAI API
let pkg;
let repo;

before(() => {
  pkg = createPackageCopy();
});

after(() => pkg.cleanup());

beforeEach(() => {
  repo = createRepo();
  repo.write("a.txt", "a\n");
  repo.commitAll();
});

afterEach(() => {
  pkg.removeEnv();
  repo.cleanup();
});

// Environment for the CLI: no inherited API settings, overrides applied on top
// (an undefined override removes the variable)
function cliEnv(overrides = {}) {
  // HOME/USERPROFILE point at an empty dir so the developer's ~/.committy is never read
  const env = {
    ...process.env,
    COMMITTY_OPENAI_API_KEY: "sk-test",
    NO_COLOR: "1",
    HOME: repo.baseDir,
    USERPROFILE: repo.baseDir,
  };
  for (const name of ["OPENAI_API_KEY", "OPENAI_BASE_URL", "COMMITTY_MODEL", "FORCE_COLOR"]) {
    delete env[name];
  }
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[name];
    else env[name] = value;
  }
  return env;
}

function runCli(args, overrides = {}, cwd = repo.dir) {
  return spawnSync(process.execPath, [pkg.binPath, ...args], {
    cwd,
    encoding: "utf-8",
    env: cliEnv(overrides),
  });
}

// Starts a local stand-in for the OpenAI API that records requests and rejects them
async function startStub(t) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ url: req.url, authorization: req.headers.authorization });
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Incorrect API key provided" } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  return { requests, baseUrl: `http://127.0.0.1:${server.address().port}/v1` };
}

// Async run, so the in-process stub can answer while the CLI waits
function runCliAsync(args, overrides = {}) {
  const child = spawn(process.execPath, [pkg.binPath, ...args], {
    cwd: repo.dir,
    env: cliEnv(overrides),
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  return new Promise((resolve) => child.on("close", (status) => resolve({ status, stdout, stderr })));
}

const stageChange = () => {
  repo.write("a.txt", "changed\n");
  repo.git("add", "a.txt");
};

test("exits with status 1 when the API key is missing", () => {
  const result = runCli([], { COMMITTY_OPENAI_API_KEY: undefined });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing OPENAI_API_KEY \(or COMMITTY_OPENAI_API_KEY\)/);
});

test("works with only OPENAI_API_KEY set", () => {
  repo.write("a.txt", "changed\n");
  const result = runCli([], { COMMITTY_OPENAI_API_KEY: undefined, OPENAI_API_KEY: "sk-openai" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No staged changes found\./);
});

test("sends OPENAI_API_KEY to the API when it is the only key", async (t) => {
  const stub = await startStub(t);
  stageChange();
  const result = await runCliAsync(["--dry-run"], {
    COMMITTY_OPENAI_API_KEY: undefined,
    OPENAI_API_KEY: "sk-openai",
    OPENAI_BASE_URL: stub.baseUrl,
  });
  assert.equal(result.status, 1);
  assert.deepEqual(stub.requests.map((r) => r.authorization), ["Bearer sk-openai"]);
});

test("sends COMMITTY_OPENAI_API_KEY to the API when both keys are set", async (t) => {
  const stub = await startStub(t);
  stageChange();
  await runCliAsync(["--dry-run"], {
    COMMITTY_OPENAI_API_KEY: "sk-committy",
    OPENAI_API_KEY: "sk-openai",
    OPENAI_BASE_URL: stub.baseUrl,
  });
  assert.deepEqual(stub.requests.map((r) => r.authorization), ["Bearer sk-committy"]);
});

test("reads the API key from the .env in committy's installation directory", async (t) => {
  const stub = await startStub(t);
  pkg.writeEnv("OPENAI_API_KEY=sk-from-install\n");
  stageChange();
  await runCliAsync(["--dry-run"], {
    COMMITTY_OPENAI_API_KEY: undefined,
    OPENAI_BASE_URL: stub.baseUrl,
  });
  assert.deepEqual(stub.requests.map((r) => r.authorization), ["Bearer sk-from-install"]);
});

test("environment variables take precedence over the installation .env", async (t) => {
  const stub = await startStub(t);
  pkg.writeEnv("COMMITTY_OPENAI_API_KEY=sk-from-install\n");
  stageChange();
  await runCliAsync(["--dry-run"], {
    COMMITTY_OPENAI_API_KEY: "sk-from-env",
    OPENAI_BASE_URL: stub.baseUrl,
  });
  assert.deepEqual(stub.requests.map((r) => r.authorization), ["Bearer sk-from-env"]);
});

test("ignores a .env in the repository being committed", async (t) => {
  // A repository could otherwise redirect the API and receive the user's key and diff
  const stub = await startStub(t);
  repo.write(".env", `COMMITTY_OPENAI_API_KEY=sk-from-repo\nOPENAI_BASE_URL=${stub.baseUrl}\n`);
  stageChange();
  const result = await runCliAsync(["--dry-run"], { COMMITTY_OPENAI_API_KEY: undefined });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing OPENAI_API_KEY/);
  assert.equal(stub.requests.length, 0);
});

test("--help works without the API key", () => {
  const result = runCli(["--help"], { COMMITTY_OPENAI_API_KEY: undefined });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: committy/);
});

test("exits with status 1 and a clear message outside a git repository", () => {
  const result = runCli([], {}, repo.baseDir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Not a git repository\. Run committy inside a git work tree\./);
  assert.doesNotMatch(result.stderr + result.stdout, /usage:/);
});

test("exits with status 1 when the API rejects the request", async (t) => {
  const stub = await startStub(t);
  stageChange();
  const result = await runCliAsync([], { OPENAI_BASE_URL: stub.baseUrl });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: 401 Incorrect API key provided/);
  assert.equal(repo.git("log", "--format=%s").trim(), "initial");
});

test("exits with status 1 when the directory does not exist", async (t) => {
  const stub = await startStub(t);
  stageChange();
  const result = await runCliAsync(["./does-not-exist"], { OPENAI_BASE_URL: stub.baseUrl });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Directory not found: \.\/does-not-exist/);
  assert.equal(stub.requests.length, 0);
});

test("--help lists every option", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0);
  for (const option of [
    "[dir]",
    "--dry-run",
    "--model <model>",
    "--mode <mode>",
    "--max-input-chars <n>",
    "--exclude <pattern...>",
    "--no-default-excludes",
  ]) {
    assert.ok(result.stdout.includes(option), `help should list ${option}`);
  }
});

test("guides the user when nothing is staged", () => {
  repo.write("a.txt", "changed\n");
  const result = runCli([]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /No staged changes found\./);
  assert.match(result.stdout, /Run "git add \." and try again\./);
});

test("parses repeated --exclude patterns and the directory argument", () => {
  repo.write("src/a.md", "doc\n");
  repo.git("add", "-A");
  const result = runCli(["src", "--exclude", "*.md", "docs/**"]);
  assert.match(result.stdout, /No staged changes found\./);
});

test("--version and -V print the package version without an API key or repository", () => {
  const { version } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf-8")
  );
  for (const flag of ["--version", "-V"]) {
    const result = runCli([flag], { COMMITTY_OPENAI_API_KEY: undefined }, repo.baseDir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), version);
  }
});

test("rejects an invalid --mode and lists the allowed values", () => {
  stageChange();
  const result = runCli(["--mode", "foo", "--dry-run"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--mode/);
  assert.match(result.stderr, /'foo'/);
  assert.match(result.stderr, /auto, full, unified0, stat, names/);
  assert.equal(result.stdout, "");
});

for (const value of ["abc", "0", "-5", "1.5"]) {
  test(`rejects --max-input-chars ${value}`, () => {
    stageChange();
    const result = runCli([`--max-input-chars=${value}`, "--dry-run"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--max-input-chars/);
    assert.ok(result.stderr.includes(`'${value}'`), result.stderr);
    assert.match(result.stderr, /Must be a positive integer/);
    assert.doesNotMatch(result.stdout, /No staged changes to commit/);
  });
}

test("rejects a repository .committy that tries to set the API endpoint", async (t) => {
  const stub = await startStub(t);
  repo.write(".committy", JSON.stringify({ baseURL: stub.baseUrl, apiKey: "sk-from-repo" }));
  stageChange();
  const result = await runCliAsync([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid config file .*\.committy: unknown key "baseURL"/);
  assert.equal(stub.requests.length, 0);
});

test("help and version do not read config files, even invalid ones", () => {
  repo.write(".committy", "{ invalid");
  repo.write("../.committy", JSON.stringify({ mode: "foo" }));
  for (const args of [["--version"], ["--help"]]) {
    assert.equal(runCli(args, { COMMITTY_OPENAI_API_KEY: undefined }).status, 0);
  }
});

test("rejects an invalid --style before running git", () => {
  const result = runCli(["--style", "foo"], {}, repo.baseDir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--style/);
  assert.match(result.stderr, /foo/);
  assert.match(result.stderr, /conventional.*gitmoji.*conventional-gitmoji.*simple.*auto/);
  assert.doesNotMatch(result.stderr, /Not a git repository/);
});
