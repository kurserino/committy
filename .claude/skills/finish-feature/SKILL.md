---
name: finish-feature
description: Wrap up a finished feature branch in committy, one confirmation at a time - show the commits and the PR draft for the user to validate, open the PR, offer to merge, offer to delete the remote branch, then offer to update main and delete the local branch (or only update main). Use after the spec-drift check of a feature is recorded, or when the user asks to finish a feature, open a PR, merge or clean up branches.
---

Close out the current feature branch with the user, asking before every outward-facing step. Talk to the user in the language they use. Follow the "Commits" rules in CLAUDE.md: no Claude attribution in commits or PR descriptions.

Each step ends with an AskUserQuestion prompt. If the user declines a step, stop the flow there, summarize what was done and what is left, and do not ask the later questions.

## 1. Preconditions

Run and check, stopping to report any failure instead of continuing:
- `git branch --show-current` is not `main`.
- `git status --short` is empty (otherwise offer to commit first, following the CLAUDE.md commit rules).
- `npm test` passes and `openspec validate --all --strict` passes.
- `openspec list` shows no active change (an unarchived change means the feature is not done).
- `git fetch origin` and `git log --oneline origin/main..HEAD` is not empty.

## 2. Validate commits and open the PR

Collect:
- Commits: `git log --format='%h %an <%ae>%n  %s%n%b' origin/main..HEAD`
- Changed files: `git diff --stat origin/main...HEAD`
- Author check: every commit must be `Kurse <lucas.kurse@hotmail.com>` and carry no Claude co-author trailer. If any fails, say so and offer to fix it before going on.

Draft the PR in English, like the commits: a title (Conventional Commit style, under 72 characters) and a body with Summary, Changes, Breaking changes (only if any) and Test plan (checked items for what was verified, unchecked for what was not, e.g. Windows). Mention archived OpenSpec changes by name.

Show the user, in the reply text, the commit list with authors, the diff stat, and the full PR title and body. Then ask with AskUserQuestion (put the PR title and body in the preview of the first option):
- **Open the PR (Recommended)**: push and create it
- **Edit title or description**: ask what to change, show the new draft and ask again
- **Not now**: stop

To open it: `git push -u origin <branch>`, write the body to a file in the scratchpad, then `gh pr create --base main --head <branch> --title <title> --body-file <file>`. Show the PR URL.

## 3. Merge

Check `gh pr checks <number>` (no checks configured is fine; failing or pending checks must be reported and make "Not now" the recommended option) and `gh pr view <number> --json mergeable`. Ask:
- **Merge commit (Recommended)**: `gh pr merge <number> --merge` (keeps the "Merge pull request #N" history used in this repo)
- **Squash and merge**: `gh pr merge <number> --squash`
- **Not now**: stop; the PR stays open

Never pass `--delete-branch` here; branch deletion is its own step. Confirm with `gh pr view <number> --json state,mergeCommit`.

## 4. Delete the remote branch

Ask:
- **Delete the branch on GitHub (Recommended)**: `git push origin --delete <branch>` (if GitHub already deleted it, report that and continue)
- **Keep it**

## 5. Update main locally

Ask:
- **Update main and delete the local branch (Recommended)**: `git switch main && git pull --ff-only && git fetch --prune origin && git branch -d <branch>`
- **Only update main**: `git switch main && git pull --ff-only && git fetch --prune origin`
- **Do nothing**

Use `git branch -d` (never `-D`); if it refuses, report why instead of forcing.

## 6. Ready for the next feature

Run `npm test`, `openspec validate --all --strict` and `openspec list`, then report: current branch and commit, branches left, tests and specs status, and that the repository is ready for the next feature.
