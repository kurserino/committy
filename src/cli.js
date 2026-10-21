import { InvalidArgumentError, Option, program } from "commander";
import { existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import { DEFAULT_MAX_INPUT_CHARS, DEFAULT_MODEL } from "./config/defaults.js";
import { loadConfigFiles } from "./config/load.js";
import { resolveSettings } from "./config/resolve.js";
import { MODES } from "./config/schema.js";
import {
  ensureGitRepository,
  getRepositoryRoot,
  getUnstagedFileNames,
  hasStagedChanges,
} from "./git/status.js";
import { runGitCommit } from "./git/commit.js";
import { prepareInputForModel, stripInputHeader } from "./input/prepare.js";
import { ensureApiKey, generateCommitMessage } from "./ai/openai.js";

const defaultDeps = { ensureApiKey, ensureGitRepository, generateCommitMessage, runGitCommit };

export async function commitAction(dir, options, overrides = {}) {
  const { ensureApiKey, ensureGitRepository, generateCommitMessage, runGitCommit } = {
    ...defaultDeps,
    ...overrides,
  };
  try {
    ensureApiKey();

    const targetDir = dir ? path.resolve(process.cwd(), dir) : "";
    if (targetDir && !existsSync(targetDir)) {
      throw new Error(`Directory not found: ${dir}`);
    }

    ensureGitRepository();

    const { project, user } = loadConfigFiles({
      repoRoot: getRepositoryRoot(),
      homeDir: os.homedir(),
    });
    const { model, mode, maxInputChars, dryRun, excludes } = resolveSettings({
      flags: options,
      env: process.env,
      project,
      user,
    });
    const hasStaged = hasStagedChanges({ dir: targetDir, excludes });

    if (!hasStaged) {
      const unstagedFiles = getUnstagedFileNames({ dir: targetDir, excludes });
      console.log(chalk.yellow("No staged changes found."));
      if (unstagedFiles.length > 0) {
        const addTarget = dir && dir.trim() ? dir : ".";
        console.log(
          chalk.gray(
            `You still have unstaged changes. Run "git add ${addTarget}" and try again.`
          )
        );
      } else {
        console.log(chalk.gray("Working tree is clean for the selected path."));
      }
      return;
    }

    const inputText = prepareInputForModel({
      mode,
      dir: targetDir,
      maxChars: maxInputChars,
      excludes,
    });

    if (!stripInputHeader(inputText)) {
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

    if (dryRun) {
      console.log(chalk.gray("\n(Dry run: commit not executed)"));
      return;
    }

    console.log(chalk.cyan("\nCommitting changes..."));
    runGitCommit(message);
  } catch (err) {
    console.error(chalk.red("Error:"), err.message);
    process.exitCode = 1;
  }
}

// CLI definition. Options have no commander defaults: an unset flag stays
// undefined so config files can supply the value (see resolveSettings)

function parsePositiveInt(value) {
  if (!/^\d+$/.test(value) || Number(value) === 0) {
    throw new InvalidArgumentError("Must be a positive integer.");
  }
  return Number(value);
}

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

export function run(argv = process.argv) {
  program
    .name("committy")
    .description("Generate git commit messages using ChatGPT")
    .version(version)
    .argument("[dir]", "Directory to use with git diff --cached")
    .option("--dry-run", "Only display the generated commit message")
    .option("--no-dry-run", "Commit even if a config file sets dryRun")
    .option(
      "--model <model>",
      `OpenAI model to use (default: COMMITTY_MODEL, config files or ${DEFAULT_MODEL})`
    )
    .addOption(
      new Option("--mode <mode>", "Diff mode (default: config files or auto)").choices(MODES)
    )
    .option(
      "--max-input-chars <n>",
      `Max characters to send to the model (default: config files or ${DEFAULT_MAX_INPUT_CHARS})`,
      parsePositiveInt
    )
    .option(
      "--exclude <pattern...>",
      "Additional git pathspec patterns to exclude (repeatable)"
    )
    .option(
      "--default-excludes",
      "Apply default exclude patterns even if a config file disables them"
    )
    .option(
      "--no-default-excludes",
      "Disable default exclude patterns (lock files, builds, maps, etc)"
    )
    .action((dir, options) => commitAction(dir, options));

  program.parse(argv);
}
