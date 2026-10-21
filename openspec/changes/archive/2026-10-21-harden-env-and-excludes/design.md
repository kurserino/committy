# Design

## Context

See proposal.md - Why. `bin/committy.js` imports `dotenv/config`, which reads `.env` from `process.cwd()`. `src/config.js` reads `COMMITTY_MODEL` at import time, so environment loading must finish before `src/cli.js` is evaluated. Exclude patterns become `:(exclude)<pattern>` pathspecs; without the `glob` magic, a pattern without a wildcard (such as `package-lock.json`) only matches that exact path from the current directory.

## Goals / Non-Goals

**Goals:**
- No setting can be injected by the repository being committed.
- The user's existing `.env` in the committy checkout keeps working.
- Bin-level tests never read the developer's real `.env`.

**Non-Goals:**
- Changing how user `--exclude` patterns are interpreted (they stay plain pathspecs).
- A configurable `.env` location.

## Decisions

- **Load `.env` from the package directory in a dedicated module.** New `src/env.js` exports `loadEnv(file)`, defaulting to `../.env` relative to its own `import.meta.url` (the installation directory; `npm link` points there), with no side effect on import so tests never read the real file. `bin/committy.js` calls `loadEnv()` and only then dynamically imports `src/cli.js`, so `COMMITTY_MODEL` is set before `src/config.js` reads it. dotenv's default of not overriding existing variables gives the environment precedence. Alternative: drop `.env` support; rejected because the user's current setup relies on it.
- **Default excludes as glob pathspecs.** `DEFAULT_EXCLUDES` becomes `**/`-prefixed globs (`**/package-lock.json`, `**/dist/**`) turned into `:(exclude,glob)<pattern>` pathspecs; `buildPathspec` keeps `:(exclude)<pattern>` for user patterns and passes already-formed pathspecs (starting with `:(`) through. In glob mode `**/` also matches the root. Alternative: add the `glob` magic to user patterns too; rejected as a behavior change outside this scope.
- **Directory check before git.** `commitAction` checks `existsSync` on the resolved `[dir]` right after the API key check and before the repository check, throwing `Directory not found: <dir>` with the path as typed.
- **Isolated package copy for bin tests.** A test helper copies `bin/`, `src/` and `package.json` to a temp directory and symlinks `node_modules`, so `import.meta.url` (and thus the `.env` lookup) points at the copy. Tests write a `.env` there when they need one. Alternative: an environment variable to override the `.env` path; rejected because it adds a user-visible knob only for tests.

## Risks / Trade-offs

- [Users with a per-repository `.env` for committy lose those settings] → Documented as breaking in the proposal and README; the fix is moving them to environment variables or the installation `.env`.
- [`**/` globs exclude more than before, e.g. any nested `build/` folder] → Intended; `--no-default-excludes` turns them off.
