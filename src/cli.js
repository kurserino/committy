import { program } from "commander";
import path from "path";
import chalk from "chalk";
import { DEFAULT_EXCLUDES, DEFAULT_MAX_INPUT_CHARS, DEFAULT_MODEL } from "./config.js";
import { ensureGitRepository, hasStagedChanges, getUnstagedFileNames } from "./git/status.js";
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
    ensureGitRepository();

    const targetDir = dir ? path.resolve(process.cwd(), dir) : "";

    const model = options.model || DEFAULT_MODEL;
    const maxInputChars = Number(options.maxInputChars || DEFAULT_MAX_INPUT_CHARS);
    const excludes = [
      ...(options.defaultExcludes === false ? [] : DEFAULT_EXCLUDES),
      ...(options.exclude && Array.isArray(options.exclude)
        ? options.exclude
        : []),
    ];
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
      mode: options.mode || "auto",
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

    if (options.dryRun) {
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

// CLI definition
export function run(argv = process.argv) {
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
      `Max characters to send to the model (default: ${DEFAULT_MAX_INPUT_CHARS})`,
      String(DEFAULT_MAX_INPUT_CHARS)
    )
    .option(
      "--exclude <pattern...>",
      "Additional git pathspec patterns to exclude (repeatable)"
    )
    .option(
      "--no-default-excludes",
      "Disable default exclude patterns (lock files, builds, maps, etc)"
    )
    .action((dir, options) => commitAction(dir, options));

  program.parse(argv);
}
