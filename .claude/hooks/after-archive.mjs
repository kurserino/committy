// PostToolUse (Bash): after an OpenSpec change is archived, ask Claude to run the drift check
import { addContext, readHookInput } from "./lib.mjs";

const input = readHookInput();
const command = input.tool_input?.command || "";

// Only an actual invocation counts: drop quoted text, then require command position
const unquoted = command.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
if (!/(^|[;&|(\n])\s*openspec\s+archive\b/.test(unquoted)) process.exit(0);

// When the output is available, require OpenSpec's success line ("Change 'x' archived as 'y'.")
const response = input.tool_response;
if (response !== undefined) {
  const output = typeof response === "string" ? response : JSON.stringify(response);
  if (!/archived as/.test(output)) process.exit(0);
}

addContext(
  "PostToolUse",
  "An OpenSpec change was just archived. Run the spec-drift skill now to compare the main specs in openspec/specs/ with the code, and let the user decide how to resolve each divergence."
);
