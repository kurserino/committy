// PreToolUse (Bash git commit): block commits not authored as Kurse or carrying Claude attribution
import { git, readHookInput } from "./lib.mjs";

const AUTHOR_NAME = "Kurse";
const AUTHOR_EMAIL = "lucas.kurse@hotmail.com";

const input = readHookInput();
const command = input.tool_input?.command ?? "";

// Heredocs: operator position and body range, so their text is never read as commands
const heredocs = [];
for (const m of command.matchAll(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1[^\n]*\n/g)) {
  const bodyStart = m.index + m[0].length;
  const end = new RegExp(`^\\s*${m[2]}\\s*$`, "m").exec(command.slice(bodyStart));
  const bodyEnd = end ? bodyStart + end.index : command.length;
  heredocs.push({ op: m.index, bodyStart, bodyEnd });
}

// Same-length copy with heredoc bodies and quoted text blanked out
let masked = command;
const blank = (s, from, to) => s.slice(0, from) + " ".repeat(to - from) + s.slice(to);
for (const h of heredocs) masked = blank(masked, h.bodyStart, h.bodyEnd);
masked = masked.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (q) => " ".repeat(q.length));

// Text of each real `git commit` invocation: its arguments plus any heredoc it reads
const messages = [];
for (const m of masked.matchAll(/(^|[;&|(\n])\s*git((?:\s+-[cC]\s+\S+)*)\s+commit\b/g)) {
  const start = m.index + m[1].length;
  const sep = masked.slice(start).search(/[;&|\n]/);
  const end = sep === -1 ? masked.length : start + sep;
  let text = command.slice(start, end);
  for (const h of heredocs) {
    if (h.op >= start && h.op < end) text += "\n" + command.slice(h.bodyStart, h.bodyEnd);
  }
  messages.push(text);
}
if (messages.length === 0) process.exit(0);

function config(key) {
  try {
    return git("config", "--get", key);
  } catch {
    return "";
  }
}

const message = messages.join("\n");
const problems = [];
if (/co-authored-by:[^\n]*(claude|anthropic)/i.test(message)) {
  problems.push("the message has a Claude Co-Authored-By trailer");
}
if (/generated with \[?claude code/i.test(message)) {
  problems.push('the message has a "Generated with Claude Code" line');
}
if (/--author\b/.test(message) && !message.includes(`${AUTHOR_NAME} <${AUTHOR_EMAIL}>`)) {
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
