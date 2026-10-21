import { test } from "node:test";
import assert from "node:assert/strict";

process.env.COMMITTY_OPENAI_API_KEY ||= "sk-test";
const { ensureApiKey, generateCommitMessage, getApiKey } = await import("../src/ai/openai.js");
const { buildPrompt } = await import("../src/ai/prompt.js");

function fakeClient(content) {
  const calls = [];
  return {
    calls,
    chat: {
      completions: {
        create: async (request) => {
          calls.push(request);
          return { choices: [{ message: { content } }] };
        },
      },
    },
  };
}

test("sends the prompt with the chosen model and returns the trimmed message", async (t) => {
  t.mock.method(console, "log", () => {});
  const client = fakeClient("  feat: add login\n");
  const message = await generateCommitMessage({ inputText: "DIFF_U0\n+x", model: "gpt-4o", client });

  assert.equal(message, "feat: add login");
  assert.deepEqual(client.calls, [
    { model: "gpt-4o", messages: [{ role: "user", content: buildPrompt("DIFF_U0\n+x") }] },
  ]);
});

test("prints the model in use", async (t) => {
  const log = t.mock.method(console, "log", () => {});
  await generateCommitMessage({ inputText: "x", model: "gpt-5", client: fakeClient("fix: x") });
  assert.match(String(log.mock.calls[0].arguments[0]), /Using model: gpt-5/);
});

test("propagates API errors", async (t) => {
  t.mock.method(console, "log", () => {});
  const client = {
    chat: { completions: { create: async () => { throw new Error("401 Unauthorized"); } } },
  };
  await assert.rejects(generateCommitMessage({ inputText: "x", model: "gpt-5", client }), /401/);
});

// Runs fn with the given API key variables, restoring the originals afterwards
function withKeys(t, keys) {
  const names = ["COMMITTY_OPENAI_API_KEY", "OPENAI_API_KEY"];
  const original = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  t.after(() => {
    for (const n of names) {
      if (original[n] === undefined) delete process.env[n];
      else process.env[n] = original[n];
    }
  });
  for (const n of names) {
    if (keys[n] === undefined) delete process.env[n];
    else process.env[n] = keys[n];
  }
}

test("ensureApiKey throws when no API key is set", (t) => {
  withKeys(t, {});
  assert.throws(() => ensureApiKey(), /Missing OPENAI_API_KEY \(or COMMITTY_OPENAI_API_KEY\)/);
});

test("getApiKey uses OPENAI_API_KEY by default", (t) => {
  withKeys(t, { OPENAI_API_KEY: "sk-openai" });
  assert.equal(getApiKey(), "sk-openai");
  assert.doesNotThrow(() => ensureApiKey());
});

test("COMMITTY_OPENAI_API_KEY overrides OPENAI_API_KEY", (t) => {
  withKeys(t, { COMMITTY_OPENAI_API_KEY: "sk-committy", OPENAI_API_KEY: "sk-openai" });
  assert.equal(getApiKey(), "sk-committy");
});

test("ensureApiKey passes when the key is set", () => {
  assert.doesNotThrow(() => ensureApiKey());
});

test("generateCommitMessage without a client requires the API key", async (t) => {
  withKeys(t, {});
  await assert.rejects(generateCommitMessage({ inputText: "x", model: "gpt-5" }), /Missing OPENAI_API_KEY/);
});
