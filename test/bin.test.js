import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "child_process";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { createRepo } from "./helpers/repo.js";

// End-to-end checks of the installed entrypoint; they never reach the OpenAI API
const binPath = fileURLToPath(new URL("../bin/committy.js", import.meta.url));

let repo;

beforeEach(() => {
  repo = createRepo();
  repo.write("a.txt", "a\n");
  repo.commitAll();
});

afterEach(() => repo.cleanup());

function runCli(args, env = {}) {
  const baseEnv = {
    ...process.env,
    COMMITTY_OPENAI_API_KEY: "sk-test",
    OPENAI_API_KEY: "",
    NO_COLOR: "1",
  };
  delete baseEnv.FORCE_COLOR;
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd: repo.dir,
    encoding: "utf-8",
    env: { ...baseEnv, ...env },
  });
}

test("exits with status 1 when the API key is missing", () => {
  const result = runCli([], { COMMITTY_OPENAI_API_KEY: "" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing OPENAI_API_KEY \(or COMMITTY_OPENAI_API_KEY\)/);
});

test("works with only OPENAI_API_KEY set", () => {
  repo.write("a.txt", "changed\n");
  const result = runCli([], { COMMITTY_OPENAI_API_KEY: "", OPENAI_API_KEY: "sk-openai" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No staged changes found\./);
});

test("--help works without the API key", () => {
  const result = runCli(["--help"], { COMMITTY_OPENAI_API_KEY: "" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: committy/);
});

test("exits with status 1 and a clear message outside a git repository", () => {
  const result = spawnSync(process.execPath, [binPath], {
    cwd: repo.baseDir,
    encoding: "utf-8",
    env: { ...process.env, COMMITTY_OPENAI_API_KEY: "sk-test", NO_COLOR: "1" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Not a git repository\. Run committy inside a git work tree\./);
  assert.doesNotMatch(result.stderr + result.stdout, /usage:/);
});

test("exits with status 1 when the API rejects the request", async (t) => {
  // Local stand-in for the OpenAI API that rejects every request
  const server = createServer((req, res) => {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Incorrect API key provided" } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  repo.write("a.txt", "changed\n");
  repo.git("add", "a.txt");

  const child = spawn(process.execPath, [binPath], {
    cwd: repo.dir,
    env: {
      ...process.env,
      COMMITTY_OPENAI_API_KEY: "sk-test",
      OPENAI_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
      NO_COLOR: "1",
    },
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const status = await new Promise((resolve) => child.on("close", resolve));

  assert.equal(status, 1);
  assert.match(stderr, /Error: 401 Incorrect API key provided/);
  assert.equal(repo.git("log", "--format=%s").trim(), "initial");
});

test("reads the API key from a .env file", () => {
  repo.write(".env", "COMMITTY_OPENAI_API_KEY=sk-from-dotenv\n");
  const env = { ...process.env };
  delete env.COMMITTY_OPENAI_API_KEY;
  delete env.OPENAI_API_KEY;
  const result = spawnSync(process.execPath, [binPath], { cwd: repo.dir, encoding: "utf-8", env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No staged changes found\./);
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

test("--version and -V print the package version without an API key or repository", async () => {
  const { version } = JSON.parse(
    (await import("fs")).readFileSync(new URL("../package.json", import.meta.url), "utf-8")
  );
  for (const flag of ["--version", "-V"]) {
    const result = spawnSync(process.execPath, [binPath, flag], {
      cwd: repo.baseDir,
      encoding: "utf-8",
      env: { ...process.env, COMMITTY_OPENAI_API_KEY: "", OPENAI_API_KEY: "" },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), version);
  }
});

test("rejects an invalid --mode and lists the allowed values", () => {
  repo.write("a.txt", "changed\n");
  repo.git("add", "a.txt");
  const result = runCli(["--mode", "foo", "--dry-run"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--mode/);
  assert.match(result.stderr, /'foo'/);
  assert.match(result.stderr, /auto, full, unified0, stat, names/);
  assert.equal(result.stdout, "");
});

for (const value of ["abc", "0", "-5", "1.5"]) {
  test(`rejects --max-input-chars ${value}`, () => {
    repo.write("a.txt", "changed\n");
    repo.git("add", "a.txt");
    const result = runCli([`--max-input-chars=${value}`, "--dry-run"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--max-input-chars/);
    assert.ok(result.stderr.includes(`'${value}'`), result.stderr);
    assert.match(result.stderr, /Must be a positive integer/);
    assert.doesNotMatch(result.stdout, /No staged changes to commit/);
  });
}
