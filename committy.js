#!/usr/bin/env node

import "dotenv/config";
import { execSync } from "child_process";
import OpenAI from "openai";
import { program } from "commander";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.COMMITTY_OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.COMMITTY_MODEL || "gpt-5";

if (!apiKey) {
  console.error(
    "❌ Missing COMMITTY_OPENAI_API_KEY. Please set it as an environment variable."
  );
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey,
});

// Prompt template - keep it compact on purpose
const buildPrompt = (inputText) =>
  `Return ONLY a single-line Conventional Commit message (e.g. feat: ..., fix: ...). Input may be a DIFF, a minimal diff (U0), a STAT summary or just FILENAMES.\n\n${inputText}`;

// Exclude noisy paths by default to reduce tokens
const DEFAULT_EXCLUDES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.lock",
  "node_modules/**",
  "dist/**",
  "build/**",
  "out/**",
  "coverage/**",
  "*.min.*",
  "*.map",
  "*.snap",
  ".env*",
];

function buildPathspec(dir, excludes) {
  const root = dir && dir.trim() ? dir : ".";
  const specs = [root, ...excludes.map((p) => `:(exclude)${p}`)];
  // Quote specs to avoid shell expansion; git will interpret globs
  return specs.map((s) => `'${s}'`).join(" ");
}

function getStagedDiff({ dir, unified, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const u = typeof unified === "number" ? `-U${unified}` : "";
  const command = `git diff --cached ${u} --no-ext-diff --find-renames -- ${pathspec}`;
  return execSync(command, {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024, // 50 MB
  });
}

function getStagedStat({ dir, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const command = `git diff --cached --stat --no-ext-diff --find-renames -- ${pathspec}`;
  return execSync(command, { encoding: "utf-8" });
}

function getStagedNamesOnly({ dir, excludes }) {
  const pathspec = buildPathspec(dir, excludes);
  const command = `git diff --cached --name-only --diff-filter=ACMRT -- ${pathspec}`;
  return execSync(command, { encoding: "utf-8" });
}

function prepareInputForModel({ mode, dir, maxChars, excludes }) {
  // mode: auto | full | unified0 | stat | names
  const ex = excludes || [];
  if (mode === "full") {
    const full = getStagedDiff({ dir, unified: 3, excludes: ex });
    return full.length > maxChars ? full.slice(0, maxChars) : full;
  }
  if (mode === "unified0") {
    const u0 = getStagedDiff({ dir, unified: 0, excludes: ex });
    return u0.length > maxChars ? u0.slice(0, maxChars) : u0;
  }
  if (mode === "stat") {
    const stat = getStagedStat({ dir, excludes: ex });
    return `DIFF_STAT\n${stat}`.slice(0, maxChars);
  }
  if (mode === "names") {
    const names = getStagedNamesOnly({ dir, excludes: ex });
    return `FILENAMES\n${names}`.slice(0, maxChars);
  }

  // auto mode: try U0; fall back to stat; then names
  try {
    const u0 = getStagedDiff({ dir, unified: 0, excludes: ex });
    if (u0.trim() && u0.length <= maxChars) return `DIFF_U0\n${u0}`;
    if (u0.trim() && u0.length > maxChars) {
      // If still too big, fall through to stat
    }
  } catch {
    // ignore and fall through
  }
  try {
    const stat = getStagedStat({ dir, excludes: ex });
    if (stat.trim()) return `DIFF_STAT\n${stat}`.slice(0, maxChars);
  } catch {
    // ignore
  }
  const names = getStagedNamesOnly({ dir, excludes: ex });
  return `FILENAMES\n${names}`.slice(0, maxChars);
}

// Generate commit message using OpenAI
async function generateCommitMessage({ inputText, model }) {
  console.log(chalk.gray(`Using model: ${model}`));
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: buildPrompt(inputText),
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// Run git commit with generated message
function runGitCommit(message) {
  const command = `git commit -m "${message.replace(/"/g, '\\"')}"`;
  execSync(command, { stdio: "ignore" });
}

// CLI definition
program
  .name("committy")
  .description("Generate git commit messages using ChatGPT")
  .argument("[dir]", "Directory to use with git diff --cached")
  .option("--dry-run", "Only display the generated commit message")
  .option(
    "--model <model>",
    "OpenAI model to use (default: env COMMITTY_MODEL or gpt-5)"
  )
  .option(
    "--mode <mode>",
    "Diff mode: auto|full|unified0|stat|names (default: auto)",
    "auto"
  )
  .option(
    "--max-input-chars <n>",
    "Max characters to send to the model (default: 48000)",
    "48000"
  )
  .option(
    "--exclude <pattern...>",
    "Additional git pathspec patterns to exclude (repeatable)"
  )
  .option(
    "--no-default-excludes",
    "Disable default exclude patterns (lock files, builds, maps, etc)"
  )
  .action(async (dir, options) => {
    try {
      const targetDir = dir ? path.resolve(process.cwd(), dir) : "";

      const model = options.model || DEFAULT_MODEL;
      const maxInputChars = Number(options.maxInputChars || 48000);
      const excludes = [
        ...(options.defaultExcludes === false ? [] : DEFAULT_EXCLUDES),
        ...(options.exclude && Array.isArray(options.exclude)
          ? options.exclude
          : []),
      ];

      const inputText = prepareInputForModel({
        mode: options.mode || "auto",
        dir: targetDir,
        maxChars: maxInputChars,
        excludes,
      });

      if (!inputText.trim()) {
        console.log(chalk.yellow("No staged changes to commit."));
        return;
      }

      console.log(chalk.cyan("Generating commit message..."));
      let message;
      try {
        message = await generateCommitMessage({ inputText, model });
      } catch (err) {
        // If rate limited by TPM or request too large, degrade input and retry once
        const msg = (err && err.message) || "";
        const isTPM = /tokens per min|TPM|Requested/i.test(msg);
        if (isTPM) {
          console.log(
            chalk.yellow(
              "API rate-limited due to input size. Retrying with summary (stat) ..."
            )
          );
          const fallback = prepareInputForModel({
            mode: "stat",
            dir: targetDir,
            maxChars: Math.min(maxInputChars, 20000),
            excludes,
          });
          message = await generateCommitMessage({ inputText: fallback, model });
        } else {
          throw err;
        }
      }

      console.log(chalk.green("\nGenerated message:\n"));
      console.log(chalk.bold(message));

      if (options.dryRun) {
        console.log(chalk.gray("\n(Dry run: commit not executed)"));
        return;
      }

      console.log(chalk.cyan("\nCommitting changes..."));
      runGitCommit(message);
    } catch (err) {
      console.error(chalk.red("Error:"), err.message);
    }
  });

program.parse();
