// SessionStart: tell Claude when a plugin the project relies on is not installed for it
import { existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";

// Each plugin's marketplace repo and what stops working without it, for the warning
const PLUGINS = {
  "claudekit-core@claudekit": { repo: "kurserino/claudekit", role: "commit-identity guard" },
  "claudekit-openspec@claudekit": { repo: "kurserino/claudekit", role: "OpenSpec skills and guards" },
  "claudekit-diff@claudekit": { repo: "kurserino/claudekit", role: "/diff panel at session start" },
  "ponytail@ponytail": { repo: "DietrichGebert/ponytail", role: "ponytail lazy-solution mode" },
};
const here = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");

let installed = {};
try {
  const file = path.join(configDir, "plugins", "installed_plugins.json");
  if (existsSync(file)) installed = JSON.parse(readFileSync(file, "utf-8")).plugins ?? {};
} catch {
  // unreadable file counts as nothing installed
}

// A project-scope install only counts for the project it was made in (path.relative ignores case and slashes on Windows)
const active = (id) =>
  (installed[id] ?? []).some(
    (i) => i.scope === "user" || (i.projectPath && path.relative(i.projectPath, here) === "")
  );

const missing = Object.keys(PLUGINS).filter((id) => !active(id));
if (missing.length > 0) {
  const repos = [...new Set(missing.map((id) => PLUGINS[id].repo))];
  const cmds = [
    ...repos.map((repo) => `claude plugin marketplace add ${repo} --scope project`),
    ...missing.map((id) => `claude plugin install ${id} --scope project`),
  ];
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `Missing project plugins: ${missing.join(", ")}. NOT active: ${missing.map((id) => PLUGINS[id].role).join(", ")}. Tell the user now and offer to run:\n${cmds.join("\n")}`,
      },
    })
  );
}
