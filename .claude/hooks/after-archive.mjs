// PostToolUse (Bash): after an OpenSpec change is archived, ask Claude to run the drift check
import { addContext, readHookInput } from "./lib.mjs";

const input = readHookInput();
const command = input.tool_input?.command || "";
if (!/\bopenspec\s+archive\b/.test(command) || /\s(--help|-h)\b/.test(command)) process.exit(0);

addContext(
  "PostToolUse",
  "An OpenSpec change was just archived. Run the spec-drift skill now to compare the main specs in openspec/specs/ with the code, and let the user decide how to resolve each divergence."
);
