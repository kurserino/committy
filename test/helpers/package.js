import { cpSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createTempDir } from "./repo.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

// Copies the package so the entrypoint resolves its .env inside the copy,
// never the developer's real .env in the checkout
export function createPackageCopy() {
  const baseDir = createTempDir();
  const dir = path.join(baseDir, "committy");
  mkdirSync(dir);
  for (const entry of ["bin", "src", "package.json"]) {
    cpSync(path.join(root, entry), path.join(dir, entry), { recursive: true });
  }
  symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"), "junction");

  const envFile = path.join(dir, ".env");
  return {
    dir,
    binPath: path.join(dir, "bin", "committy.js"),
    writeEnv: (content) => writeFileSync(envFile, content),
    removeEnv: () => rmSync(envFile, { force: true }),
    cleanup: () => rmSync(baseDir, { recursive: true, force: true }),
  };
}
