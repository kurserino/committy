import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRepo, numberedLines } from "./helpers/repo.js";
import { DEFAULT_MAX_INPUT_CHARS } from "../src/config/defaults.js";
import { prepareInputForModel, stripInputHeader } from "../src/input/prepare.js";

let repo;
const originalCwd = process.cwd();

beforeEach(() => {
  repo = createRepo();
  repo.write("file.txt", numberedLines(200));
  repo.write("gone.txt", "to be deleted\n");
  repo.commitAll();
  process.chdir(repo.dir);
});

afterEach(() => {
  process.chdir(originalCwd);
  repo.cleanup();
});

const prepare = (overrides) =>
  prepareInputForModel({ mode: "auto", dir: "", maxChars: 48000, excludes: [], ...overrides });

// Change every line of file.txt so the diff is large
const stageBigChange = () => {
  repo.write("file.txt", numberedLines(200).replace(/line/g, "LINE"));
  repo.git("add", "file.txt");
};

const stageSmallChange = () => {
  repo.write("file.txt", numberedLines(200, 100));
  repo.git("add", "file.txt");
};

test("stripInputHeader strips known input headers", () => {
  assert.equal(stripInputHeader("DIFF_U0\ndiff --git a/x b/x"), "diff --git a/x b/x");
  assert.equal(stripInputHeader("DIFF_STAT\n x | 1 +"), "x | 1 +");
  assert.equal(stripInputHeader("FILENAMES\nsrc/a.js\n"), "src/a.js");
  assert.equal(stripInputHeader("DIFF_PARTIAL\n x | 1 +"), "x | 1 +");
});

test("stripInputHeader returns empty string when only a header is present", () => {
  assert.equal(stripInputHeader("FILENAMES\n"), "");
  assert.equal(stripInputHeader("DIFF_STAT\n\n"), "");
});

test("stripInputHeader keeps unknown text intact", () => {
  assert.equal(stripInputHeader("diff --git a/x b/x\n"), "diff --git a/x b/x");
});

test("full mode sends the diff with context and no header", () => {
  stageSmallChange();
  const input = prepare({ mode: "full" });
  assert.match(input, /^diff --git/);
  assert.match(input, /^ line 97$/m);
});

test("full mode truncates to maxChars", () => {
  stageBigChange();
  assert.equal(prepare({ mode: "full", maxChars: 100 }).length, 100);
});

test("unified0 mode sends the diff without context and no header", () => {
  stageSmallChange();
  const input = prepare({ mode: "unified0" });
  assert.match(input, /^diff --git/);
  assert.match(input, /^\+changed 100$/m);
  assert.doesNotMatch(input, /^ line 99$/m);
});

test("unified0 mode truncates to maxChars", () => {
  stageBigChange();
  assert.equal(prepare({ mode: "unified0", maxChars: 100 }).length, 100);
});

test("stat mode sends a DIFF_STAT summary", () => {
  stageSmallChange();
  const input = prepare({ mode: "stat" });
  assert.match(input, /^DIFF_STAT\n/);
  assert.match(input, /file\.txt \| 2 \+-/);
  assert.doesNotMatch(input, /changed 100/);
});

test("stat mode truncates to maxChars including the header", () => {
  stageSmallChange();
  assert.equal(prepare({ mode: "stat", maxChars: 12 }), "DIFF_STAT\n f");
});

test("names mode sends FILENAMES with one path per line", () => {
  stageSmallChange();
  repo.write("src/new.js", "x\n");
  repo.git("add", "-A");
  assert.equal(prepare({ mode: "names" }), "FILENAMES\nfile.txt\nsrc/new.js\n");
});

test("names mode leaves out deleted files", () => {
  repo.git("rm", "-q", "gone.txt");
  assert.equal(stripInputHeader(prepare({ mode: "names" })), "");
});

test("auto mode uses DIFF_U0 when the zero-context diff fits", () => {
  stageSmallChange();
  const input = prepare({ mode: "auto" });
  assert.match(input, /^DIFF_U0\ndiff --git/);
  assert.match(input, /^\+changed 100$/m);
});

test("auto mode sends a DIFF_PARTIAL with the stat and a truncated diff when the diff is too large", () => {
  stageBigChange();
  const input = prepare({ mode: "auto", maxChars: 900 });
  assert.match(input, /^DIFF_PARTIAL\n/);
  assert.match(input, /file\.txt +\|/);
  assert.match(input, /^diff --git a\/file\.txt/m);
  assert.match(input, /\[truncated\]\n$/);
  assert.ok(input.length <= 900);
});

test("a huge file does not hide the small ones", () => {
  stageBigChange();
  repo.write("small.txt", "tiny change\n");
  repo.git("add", "small.txt");
  const input = prepare({ mode: "auto", maxChars: 1500 });
  assert.match(input, /^DIFF_PARTIAL\n/);
  assert.match(input, /^diff --git a\/small\.txt/m);
  assert.match(input, /^\+tiny change$/m);
  assert.equal(input.match(/\[truncated\]/g).length, 1);
  assert.ok(input.length <= 1500);
});

test("truncation ends at a hunk boundary when a whole hunk fits", () => {
  const lines = numberedLines(200).split("\n");
  for (let n = 5; n < 200; n += 10) lines[n] = `CHANGED ${n}`;
  repo.write("file.txt", lines.join("\n"));
  repo.git("add", "file.txt");
  const input = prepare({ mode: "auto", maxChars: 700 });
  const hunks = input.match(/^@@ /gm).length;
  assert.ok(hunks >= 1 && hunks < 20, `expected a partial set of hunks, got ${hunks}`);
  assert.match(input, /\+CHANGED \d+\n\[truncated\]\n$/);
});

test("truncation falls back to a line boundary inside a single large hunk", () => {
  stageBigChange();
  const input = prepare({ mode: "auto", maxChars: 900 });
  assert.equal(input.match(/^@@ /gm).length, 1);
  assert.match(input, /\n[-+]LINE?[^\n]*\n\[truncated\]\n$/i);
});

test("the hybrid input stays under 12000 chars and 3000 chars per file", () => {
  for (const name of Array.from({ length: 12 }, (_, i) => `f${i}.txt`)) {
    repo.write(name, numberedLines(400));
  }
  repo.commitAll("add files");
  for (const name of Array.from({ length: 12 }, (_, i) => `f${i}.txt`)) {
    repo.write(name, numberedLines(400).replace(/line/g, "LINE"));
  }
  repo.git("add", "-A");
  const input = prepare({ mode: "auto", maxChars: 48000 });
  assert.match(input, /^DIFF_PARTIAL\n/);
  assert.ok(input.length <= 12000, `hybrid input is ${input.length} chars`);
  for (const file of input.split(/^(?=diff --git )/m).slice(1)) {
    assert.ok(file.length <= 3000, `a file contributed ${file.length} chars`);
  }
});

test("the default size cap keeps a 20000 char diff within 16000 chars", () => {
  repo.write("file.txt", numberedLines(1500).replace(/line/g, "LINE"));
  repo.git("add", "file.txt");
  const input = prepare({ mode: "auto", maxChars: DEFAULT_MAX_INPUT_CHARS });
  assert.equal(DEFAULT_MAX_INPUT_CHARS, 16000);
  assert.ok(input.length <= 16000);
});

test("auto mode uses the stat alone when it leaves no room for diff content", () => {
  stageBigChange();
  const input = prepare({ mode: "auto", maxChars: 150 });
  assert.match(input, /^DIFF_STAT\n/);
  assert.match(input, /file\.txt/);
  assert.ok(input.length <= 150);
});

test("auto mode truncates the stat fallback to maxChars", () => {
  stageBigChange();
  assert.equal(prepare({ mode: "auto", maxChars: 20 }).length, 20);
});

test("auto mode falls back to FILENAMES when there is no diff or stat", () => {
  // Nothing staged: U0 and stat are empty, so the names step is reached
  assert.equal(prepare({ mode: "auto" }), "FILENAMES\n");
});

test("unknown modes behave like auto", () => {
  stageSmallChange();
  assert.match(prepare({ mode: "whatever" }), /^DIFF_U0\n/);
});

test("excludes are applied to the input", () => {
  stageSmallChange();
  repo.write("yarn.lock", "lock\n");
  repo.git("add", "yarn.lock");
  const input = prepare({ mode: "names", excludes: ["yarn.lock"] });
  assert.equal(input, "FILENAMES\nfile.txt\n");
});
