# staged-changes-check Specification

## Purpose
Detect, before calling the model, whether there is anything staged to commit, and guide the user when there is not.

## Requirements

### Requirement: Staged changes detection
Before preparing any input, the CLI SHALL run `git diff --cached --quiet` with the same pathspec (directory and excludes) used for the diff. Exit status 0 means nothing is staged, 1 means changes are staged, and any other status SHALL raise an error with git's output.

#### Scenario: Changes staged
- **WHEN** at least one non-excluded file under the selected path is staged
- **THEN** the CLI continues to input preparation

### Requirement: Guidance when nothing is staged
When nothing is staged, the CLI SHALL print "No staged changes found." and stop without calling the API. If there are unstaged tracked changes or untracked (non-ignored) files under the selected path, it SHALL suggest running `git add <dir>` (or `git add .` when no directory was given); otherwise it SHALL say the working tree is clean for the selected path.

#### Scenario: Unstaged changes exist
- **WHEN** nothing is staged but there are modified or untracked files under the selected path
- **THEN** the CLI prints `You still have unstaged changes. Run "git add ." and try again.`

#### Scenario: Unstaged changes in a scoped directory
- **WHEN** the user runs `committy ./src` with nothing staged and unstaged changes under `src`
- **THEN** the suggestion is `git add ./src`

#### Scenario: Clean working tree
- **WHEN** nothing is staged and there are no unstaged or untracked files under the selected path
- **THEN** the CLI prints "Working tree is clean for the selected path."

### Requirement: Git repository check
Before detecting staged changes, the CLI SHALL verify that the current directory is inside a git work tree. If it is not, the CLI SHALL print `Error: Not a git repository. Run committy inside a git work tree.` and exit with status 1 without printing git's own usage output.

#### Scenario: Outside a git repository
- **WHEN** the user runs `committy` in a directory that is not inside a git repository
- **THEN** the CLI prints the "Not a git repository" error and exits with status 1

#### Scenario: Inside the .git directory
- **WHEN** the user runs `committy` from inside a repository's `.git` directory
- **THEN** the CLI prints the "Not a git repository" error and exits with status 1

#### Scenario: Inside a subdirectory of a repository
- **WHEN** the user runs `committy` from a subdirectory of a git work tree
- **THEN** the check passes and the run continues to staged changes detection
