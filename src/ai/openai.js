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
  });

  return cleanMessage(response.choices[0].message.content, { oneLine });
}
