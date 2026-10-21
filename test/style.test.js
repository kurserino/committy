import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLE_CHOICES, classifySubject, detectStyle } from "../src/ai/style.js";

test("style choices are the fixed styles plus auto", () => {
  assert.deepEqual(STYLE_CHOICES, ["conventional", "gitmoji", "conventional-gitmoji", "simple", "auto"]);
});

test("classifies each style", () => {
  const cases = [
    ["feat(config): add project files", "conventional"],
    ["fix: handle empty diff", "conventional"],
    ["feat!: drop node 16", "conventional"],
    ["refactor(cli)!: rename options", "conventional"],
    ["feat(api): ✨ add login", "conventional-gitmoji"],
    ["fix: :bug: handle empty diff", "conventional-gitmoji"],
    ["✨ add login", "gitmoji"],
    ["🐛 fix crash on empty diff", "gitmoji"],
    [":memo: update readme", "gitmoji"],
    ["Add login form", "simple"],
    ["Revert \"Add login form\"", "simple"],
  ];
  for (const [subject, style] of cases) {
    assert.equal(classifySubject(subject), style, subject);
  }
});

test("leaves unrecognized subjects unclassified", () => {
  for (const subject of ["wip", "JIRA-12: add login", "Feat: add login", "update stuff"]) {
    assert.equal(classifySubject(subject), null, subject);
  }
});

test("detects the style used by more than half of the subjects", () => {
  assert.equal(detectStyle(["✨ add a", "🐛 fix b", "feat: c"]), "gitmoji");
  assert.equal(detectStyle(["Add a", "Fix b", "Update c", "wip"]), "simple");
  assert.equal(detectStyle(["feat(api): ✨ a", "fix: 🐛 b", "Add c"]), "conventional-gitmoji");
});

test("mixed history falls back to conventional", () => {
  assert.equal(detectStyle(["✨ add a", "Fix b"]), "conventional");
  assert.equal(detectStyle(["✨ add a", "Fix b", "wip", "chore stuff"]), "conventional");
});

test("no subjects falls back to conventional", () => {
  assert.equal(detectStyle([]), "conventional");
});
