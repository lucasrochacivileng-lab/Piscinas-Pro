import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// CI e a Vercel clonam o repositorio apenas para construir: hooks nao se aplicam.
if (process.env.CI || process.env.VERCEL) process.exit(0);
if (!existsSync(resolve(root, ".git"))) process.exit(0);

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, stdio: "ignore" });
  console.log("Hooks do git ativados a partir de .githooks");
} catch {
  console.warn("Nao foi possivel ativar os hooks do git; siga com validacao manual.");
}
