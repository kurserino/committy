// SessionStart: tell Claude when a claudekit plugin declared in this project is not installed
import { existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";

const WANTED = ["claudekit-core@claudekit", "claudekit-openspec@claudekit"];
let installed = {};
try {
  const file = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json");
  if (existsSync(file)) installed = JSON.parse(readFileSync(file, "utf-8")).plugins ?? {};
} catch {
  // unreadable file counts as nothing installed
}

const missing = WANTED.filter((id) => !installed[id]);
if (missing.length > 0) {
  const cmds = ["claude plugin marketplace add kurserino/claudekit --scope project", ...missing.map((id) => `claude plugin install ${id} --scope project`)];
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `Missing claudekit plugins: ${missing.join(", ")}. Commit-identity and OpenSpec guards are NOT active. Tell the user now and offer to run:\n${cmds.join("\n")}`,
      },
    })
  );
}
