# Committy

**Committy** is a lightweight CLI tool that uses OpenAI models (default: gpt-5-mini) to generate smart, concise, and well-formatted Git commit messages based on your staged changes.

> Let AI write your commit messages – so you can focus on shipping great code.

---

## ✨ Features

- 💬 Generates commit messages using OpenAI API (default model: gpt-5-mini)
- 🧠 Understands the context of your staged `git diff`
- 🚀 Automatically commits with the generated message
- 🔍 `--dry-run` option to preview messages before committing
- 📁 Accepts directory as argument (only diffs from that directory)
- 🔻 Token-aware modes to handle large diffs: `auto`, `unified0`, `stat`, `names`
- 🧹 Default exclude patterns to reduce noise (lockfiles, builds, maps)
- ⚙️ Per-project (`.committy`) and per-user (`~/.committy`) config files
- 🎨 Message styles (Conventional Commits, gitmoji, plain git, or auto-detected) and optional bullet-point body

---

## 📦 Installation

```bash
git clone https://github.com/your-user/committy.git
cd committy
npm install
npm link
```

> Committy uses the standard `OPENAI_API_KEY` environment variable. If you already have it set, there is nothing else to do:

```bash
export OPENAI_API_KEY="sk-..."
```

Add it to your shell config (e.g. `~/.zshrc`, `~/.bashrc`) to persist it across sessions.

#### Optional: a dedicated key for Committy

Set `COMMITTY_OPENAI_API_KEY` to give Committy its own key (for example, a project key to track its cost or limit its permissions). When set, it takes precedence over `OPENAI_API_KEY`:

```bash
export COMMITTY_OPENAI_API_KEY="sk-..."
```

#### Optional: a `.env` file

Instead of exporting variables, you can copy `.env.example` to `.env` **in the folder where you cloned Committy**. Committy only reads that file; a `.env` in the repository you are committing is never read, so a repository cannot swap your key or redirect your diff to another server. Variables exported in your shell take precedence over the file.

### 🪟 Windows (PowerShell)

On PowerShell, `npm link` creates a `committy.ps1` shim, which Windows may block with the error _"running scripts is disabled on this system"_. Run this once to allow locally installed scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 🧪 Usage

```bash
committy             # Generates commit message from staged changes and commits
committy --dry-run   # Just shows the message, does not commit
committy ./src       # Filters the diff to ./src directory only
committy --model gpt-4o  # Override default model
```

### 🔁 Example

```bash
git add .
committy

# Output:
# Generating commit message...
#
# Generated message:
# feat: add support for dynamic theme switching in settings page
#
# Committing changes...
```

---

## 🛠 Options

| Argument                 | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `[dir]`                  | Optional directory to scope the git diff                         |
| `--dry-run`              | Shows the generated message, no commit                           |
| `--no-dry-run`           | Commits even if a config file sets `dryRun`                      |
| `--model <model>`        | OpenAI model to use (default: env `COMMITTY_MODEL`, config files or `gpt-5-mini`) |
| `--style <style>`        | Message style: `conventional` (default), `gitmoji`, `conventional-gitmoji`, `simple`, `auto` |
| `--one-line`             | Single-line message (the default)                                |
| `--no-one-line`          | Subject line plus a short bullet-point body                      |
| `--mode <mode>`          | Diff mode: `auto` (default), `full`, `unified0`, `stat`, `names` |
| `--max-input-chars <n>`  | Max characters to send to the model, a positive integer (default: `16000`) |
| `--exclude <pattern...>` | Additional git pathspec patterns to exclude (repeatable)         |
| `--default-excludes`     | Apply the default excludes even if a config file disables them   |
| `--no-default-excludes`  | Disable default exclude patterns (lock files, builds, maps, etc) |
| `-V`, `--version`        | Print the installed version                                      |

Default exclude patterns apply at any depth of the repository (so `web/package-lock.json` and `packages/app/dist/**` are excluded too): `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.lock`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `*.min.*`, `*.map`, `*.snap`, `.env*`.

### Handling large diffs

- Use automatic fallback (default): `committy`. It sends the zero-context diff when it fits `--max-input-chars`; otherwise the full `--stat` plus each file's diff cut to a few thousand characters (marked `[truncated]`), so one huge file cannot hide the others; then `--stat` alone, then file names
- Force minimal context per hunk: `committy --mode unified0`
- Use summary only: `committy --mode stat`
- Smaller size cap: `committy --mode unified0 --max-input-chars 8000`
- Larger size cap: `committy --max-input-chars 48000`
- Add extra excludes: `committy --exclude 'docs/**' '*.md'`

If the API reports input too large or TPM limits, Committy automatically retries with a summarized `--stat` input.

---

## ⚙️ Configuration files

Committy reads two optional JSON files:

- **Project**: `.committy` at the root of the git repository (found from any subdirectory). Commit it to share settings with everyone working on the repo.
- **User**: `.committy` in your home directory (`~/.committy`, or `%USERPROFILE%\.committy` on Windows).

```json
{
  "model": "gpt-5-mini",
  "mode": "auto",
  "maxInputChars": 30000,
  "exclude": ["generated/**", "*.pdf"],
  "defaultExcludes": true,
  "dryRun": false,
  "style": "conventional",
  "oneLine": true
}
```

| Key               | Type                         | Same as                                  |
| ----------------- | ---------------------------- | ---------------------------------------- |
| `model`           | string                       | `--model`                                |
| `mode`            | `auto`, `full`, `unified0`, `stat`, `names` | `--mode`                  |
| `maxInputChars`   | positive integer             | `--max-input-chars`                      |
| `exclude`         | array of pathspec patterns   | `--exclude`                              |
| `defaultExcludes` | boolean                      | `--default-excludes` / `--no-default-excludes` |
| `dryRun`          | boolean                      | `--dry-run` / `--no-dry-run`             |
| `style`           | `conventional`, `gitmoji`, `conventional-gitmoji`, `simple`, `auto` | `--style` |
| `oneLine`         | boolean                      | `--one-line` / `--no-one-line`           |

**Precedence**, for each setting: command-line flag > environment variable (`COMMITTY_MODEL`) > project file > user file > built-in default.

`exclude` is the exception: patterns **add up** (defaults + user file + project file + `--exclude`). Patterns from config files are relative to the repository root; `--exclude` patterns are relative to the current directory.

Files may be UTF-8 (with or without BOM) or UTF-16 with BOM, so files saved by Notepad or written with `>` in Windows PowerShell 5.1 work.

Unknown keys, invalid values or malformed JSON stop the run with an error naming the file. The API key and API endpoint can **never** be set in a config file, so a cloned repository cannot redirect your requests or swap your credentials: keep them in environment variables or committy's own `.env`.

---

## 🎨 Message styles

| Style                  | Example                                           |
| ---------------------- | ------------------------------------------------- |
| `conventional`         | `feat(config): add project and user config files` |
| `gitmoji`              | `✨ add project and user config files`            |
| `conventional-gitmoji` | `feat(config): ✨ add project and user config files` |
| `simple`               | `Add project and user config files`               |

`auto` looks at the subjects of the last 20 non-merge commits (locally, no API call) and uses the style that more than half of them follow, falling back to `conventional`. It prints `Detected commit style: <style>`.

Messages are one line by default. With `--no-one-line` (or `"oneLine": false`) Committy writes a subject, a blank line and 2-5 short bullets on what changed and why:

```
feat(config): add project and user config files

- Resolve settings as flag > env > project > user
- Validate keys strictly; never read the API key or URL
```

In one-line mode only the first line of the model's answer is used, so the commit never gets an unexpected body.

---

## 🗂 Project Structure

```
bin/committy.js      # CLI entrypoint (loads committy's own .env and starts the CLI)
src/
  cli.js             # Commander definition and main flow
  config/            # Defaults, .committy loading/validation and settings precedence
  git/               # Git commands: staged diff, status, commit, pathspec
  input/             # Builds the size-bounded input sent to the model
  ai/                # OpenAI client and prompt
test/                # Unit tests (node:test) — run with `npm test`
openspec/            # Specs and change proposals (OpenSpec)
```

---

## 💡 Why use Committy?

- Avoid vague commit messages like `update stuff` or `fix bug`.
- Maintain consistency and clarity across your Git history.
- Save time thinking about how to summarize changes.

---

## 🧱 Built With

- [Node.js](https://nodejs.org/)
- [Commander](https://github.com/tj/commander.js)
- [OpenAI API](https://platform.openai.com/)
- [Chalk](https://github.com/chalk/chalk)

---

## 📌 Roadmap

- [ ] Support more AI providers besides OpenAI: Anthropic (Claude) and Google (Gemini)
- [ ] Interactive confirmation before committing: accept, edit in `$EDITOR` or regenerate
- [ ] OpenAI-compatible base URL setting (Ollama, LM Studio, OpenRouter, Azure)
- [ ] Redact secrets (keys, tokens, `.env` values) from the diff before sending it
- [ ] Extra context for the model: a `--context` flag and the ticket ID from the branch name
- [ ] Message language option (e.g. `--lang pt-BR`)
- [ ] `--amend` to regenerate the last commit's message
- [ ] Support for `git commit -a`
- [ ] Support custom prompt templates
- [ ] Git hook integration
- [ ] Clipboard copy option
- [ ] Offline fallback via local model (experimental)

---

## ⚠️ Disclaimer

Committy sends your `git diff` content to OpenAI’s API. Do not use it with sensitive or proprietary code unless you are sure about OpenAI's data policies.

---

## 📄 License

MIT © [Kurse]
