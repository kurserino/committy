import OpenAI from "openai";
import chalk from "chalk";
import { buildPrompt, cleanMessage } from "./prompt.js";

let openai;

// OPENAI_API_KEY is the default; COMMITTY_OPENAI_API_KEY overrides it to give committy its own key
export function getApiKey() {
  return process.env.COMMITTY_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}

export function ensureApiKey() {
  if (!getApiKey()) {
    throw new Error(
      "Missing OPENAI_API_KEY (or COMMITTY_OPENAI_API_KEY). Please set it as an environment variable."
    );
  }
}

// Create the client on first use so commands like --help work without a key
function getClient() {
  ensureApiKey();
  openai ??= new OpenAI({ apiKey: getApiKey() });
  return openai;
}

// Only these gpt-5 reasoning models accept reasoning_effort "minimal"; others would reject it
const REASONING_MODEL = /^gpt-5(-mini|-nano)?(-\d{4}-\d{2}-\d{2})?$/;

// Output caps leave room for the message once reasoning is minimal
const MAX_COMPLETION_TOKENS = { oneLine: 256, multiLine: 512 };

export function outputLimits(model, oneLine) {
  if (!REASONING_MODEL.test(model)) return {};
  return {
    reasoning_effort: "minimal",
    verbosity: "low",
    max_completion_tokens: oneLine ? MAX_COMPLETION_TOKENS.oneLine : MAX_COMPLETION_TOKENS.multiLine,
  };
}

// Generate commit message using OpenAI
export async function generateCommitMessage({
  inputText,
  model,
  style,
  oneLine = true,
  client = getClient(),
}) {
  console.log(chalk.gray(`Using model: ${model}`));
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: buildPrompt(inputText, { style, oneLine }),
      },
    ],
    ...outputLimits(model, oneLine),
  });

  const [choice] = response.choices;
  if (choice.finish_reason === "length") throw new Error("The model reply was cut off");
  return cleanMessage(choice.message.content, { oneLine });
}
