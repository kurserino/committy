// PreToolUse (Bash git commit): block commits not authored as Kurse or carrying Claude attribution
import { git, readHookInput } from "./lib.mjs";

const AUTHOR_NAME = "Kurse";
const AUTHOR_EMAIL = "lucas.kurse@hotmail.com";

const input = readHookInput();
const command = input.tool_input?.command ?? "";
if (!/\bgit\b[^\n]*\bcommit\b/.test(command)) process.exit(0);

function config(key) {
  try {
    return git("config", "--get", key);
  } catch {
    return "";
  }
}

const problems = [];
if (/co-authored-by:[^\n]*(claude|anthropic)/i.test(command)) {
  problems.push("the message has a Claude Co-Authored-By trailer");
}
if (/generated with \[?claude code/i.test(command)) {
  problems.push('the message has a "Generated with Claude Code" line');
}
if (/--author\b/.test(command) && !command.includes(`${AUTHOR_NAME} <${AUTHOR_EMAIL}>`)) {
  problems.push(`--author is not "${AUTHOR_NAME} <${AUTHOR_EMAIL}>"`);
}
const name = config("user.name");
const email = config("user.email");
if (name !== AUTHOR_NAME || email !== AUTHOR_EMAIL) {
  problems.push(
    `git identity is "${name} <${email}>"; run: git config user.name "${AUTHOR_NAME}" && git config user.email "${AUTHOR_EMAIL}"`
  );
}

if (problems.length > 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Commit blocked (see "Commits" in CLAUDE.md): ${problems.join("; ")}.`,
      },
    })
  );
}
