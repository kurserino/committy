import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "../src/ai/prompt.js";

test("asks for a single-line Conventional Commit and includes the input", () => {
  const prompt = buildPrompt("DIFF_U0\n+hello");
  assert.match(prompt, /^Return ONLY a single-line Conventional Commit message/);
  assert.ok(prompt.endsWith("\n\nDIFF_U0\n+hello"));
});

test("describes every input format the model can receive", () => {
  const prompt = buildPrompt("");
  for (const format of ["DIFF", "U0", "STAT", "FILENAMES"]) {
    assert.ok(prompt.includes(format), `prompt should mention ${format}`);
  }
});
