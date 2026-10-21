import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Only committy's own .env is read: a .env in the repository being committed
// could otherwise redirect the API endpoint or swap the key
export const installEnvFile = fileURLToPath(new URL("../.env", import.meta.url));

// Existing environment variables always win over the file
export function loadEnv(file = installEnvFile) {
  dotenv.config({ path: file, quiet: true });
}
