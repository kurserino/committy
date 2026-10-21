// PreToolUse (Edit|Write): remind Claude to work through OpenSpec when editing code with no active change
import path from "path";
import { activeChanges, addContext, projectDir, readHookInput } from "./lib.mjs";

const input = readHookInput();
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).split(path.sep).join("/");
if (!/^(src|bin)\//.test(rel)) process.exit(0);

if (activeChanges().length === 0) {
  addContext(
    "PreToolUse",
    `You are editing ${rel} but there is no active OpenSpec change. Per CLAUDE.md, code changes must go through OpenSpec: stop, create a change with the openspec-propose workflow (use skip_specs: true for a pure refactor), then apply it.`
  );
}
