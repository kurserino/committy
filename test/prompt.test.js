import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, cleanMessage } from "../src/ai/prompt.js";
import { STYLES } from "../src/ai/style.js";

test("defaults to a single-line Conventional Commit and includes the input", () => {
  const prompt = buildPrompt("DIFF_U0\n+hello");
  assert.match(prompt, /^Return ONLY a single-line commit message as a Conventional Commit \(type\(scope\): description/);
  assert.ok(prompt.endsWith("\n\nDIFF_U0\n+hello"));
});

test("describes every input format the model can receive", () => {
  const prompt = buildPrompt("");
  for (const format of ["DIFF", "U0", "STAT", "FILENAMES"]) {
    assert.ok(prompt.includes(format), `prompt should mention ${format}`);
  }
});

test("asks for each fixed style in both line modes", () => {
  for (const [style, phrase] of Object.entries(STYLES)) {
    assert.ok(buildPrompt("x", { style }).startsWith(`Return ONLY a single-line commit message as ${phrase}.`), style);
    const multi = buildPrompt("x", { style, oneLine: false });
    assert.ok(multi.startsWith(`Return ONLY a commit message: a subject line as ${phrase}, a blank line`), style);
  }
});

test("style phrases describe the expected shapes", () => {
  assert.match(buildPrompt("x", { style: "gitmoji" }), /gitmoji\.dev emoji/);
  assert.match(buildPrompt("x", { style: "conventional-gitmoji" }), /Conventional Commit with a gitmoji/);
  assert.match(buildPrompt("x", { style: "simple" }), /capitalized imperative, no prefix, max 50 characters/);
});

test("multi-line prompt asks for 2-5 bullets wrapped at 72 columns", () => {
  assert.match(buildPrompt("x", { oneLine: false }), /2-5 short "- " bullets on what changed and why, wrapped at 72 columns/);
});

test("cleanMessage trims and keeps only the first non-empty line by default", () => {
  assert.equal(cleanMessage("  feat: add login\n"), "feat: add login");
  assert.equal(cleanMessage("\n\nfeat: add login\n\nAdds the login form."), "feat: add login");
});

test("cleanMessage keeps the body in multi-line mode", () => {
  const body = "feat: add login\n\n- Add the form\n- Validate input";
  assert.equal(cleanMessage(`  ${body}\n`, { oneLine: false }), body);
});

test("cleanMessage removes a surrounding code fence", () => {
  assert.equal(cleanMessage("```\nfeat: add login\n```"), "feat: add login");
  assert.equal(cleanMessage("```text\nfeat: add login\n\n- Add form\n```", { oneLine: false }), "feat: add login\n\n- Add form");
});
