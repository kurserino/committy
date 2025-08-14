# Committy

**Committy** is a lightweight CLI tool that uses OpenAI models (default: gpt-5) to generate smart, concise, and well-formatted Git commit messages based on your staged changes.

> Let AI write your commit messages – so you can focus on shipping great code.

---

## ✨ Features

- 💬 Generates commit messages using OpenAI API (default model: gpt-5)
- 🧠 Understands the context of your staged `git diff`
- 🚀 Automatically commits with the generated message
- 🔍 `--dry-run` option to preview messages before committing
- 📁 Accepts directory as argument (only diffs from that directory)
- 🔻 Token-aware modes to handle large diffs: `auto`, `unified0`, `stat`, `names`
- 🧹 Default exclude patterns to reduce noise (lockfiles, builds, maps)

---

## 📦 Installation

```bash
git clone https://github.com/your-user/committy.git
cd committy
npm install
npm link
```

> You must set the OpenAI API key as a global environment variable:

```bash
export COMMITTY_OPENAI_API_KEY="sk-..."
```

Add it to your shell config (e.g. `~/.zshrc`, `~/.bashrc`) to persist it across sessions.

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
| `--model <model>`        | OpenAI model to use (default: env `COMMITTY_MODEL` or `gpt-5`)   |
| `--mode <mode>`          | Diff mode: `auto` (default), `full`, `unified0`, `stat`, `names` |
| `--max-input-chars <n>`  | Max characters to send to the model (default: `48000`)           |
| `--exclude <pattern...>` | Additional git pathspec patterns to exclude (repeatable)         |
| `--no-default-excludes`  | Disable default exclude patterns (lock files, builds, maps, etc) |

Default exclude patterns include: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.lock`, `node_modules/**`, `dist/**`, `build/**`, `out/**`, `coverage/**`, `*.min.*`, `*.map`, `*.snap`, `.env*`.

### Handling large diffs

- Use automatic fallback (default): `committy`
- Force minimal context per hunk: `committy --mode unified0`
- Use summary only: `committy --mode stat`
- Aggressive size cap: `committy --mode unified0 --max-input-chars 30000`
- Add extra excludes: `committy --exclude 'docs/**' '*.md'`

If the API reports input too large or TPM limits, Committy automatically retries with a summarized `--stat` input.

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
