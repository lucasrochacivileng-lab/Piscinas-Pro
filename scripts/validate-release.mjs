import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const production = process.argv.includes("--production");
const checks = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}

const rootPackage = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const webPackage = JSON.parse(await readFile(resolve(root, "apps/web/package.json"), "utf8"));
const roadmap = await readFile(resolve(root, "docs/roadmap.md"), "utf8");
const gitignore = await readFile(resolve(root, ".gitignore"), "utf8");
const observabilitySource = await readFile(resolve(root, "apps/web/src/lib/observability.ts"), "utf8");
const migrationNames = (await readdir(resolve(root, "supabase/migrations")))
  .filter((name) => name.endsWith(".sql"));

assert(rootPackage.version === webPackage.version, "versões root/web sincronizadas");
assert(observabilitySource.includes(`appVersion: "${rootPackage.version}"`), "telemetria referencia a versão da release");
assert(roadmap.includes(`versao \`${rootPackage.version}\``), "roadmap referencia a versão da release");
assert(/^\d+\.\d+\.\d+$/.test(webPackage.dependencies["@supabase/supabase-js"]), "supabase-js usa versão exata");
assert(/^\d+\.\d+\.\d+$/.test(rootPackage.devDependencies["@playwright/test"]), "Playwright usa versão exata");
assert(gitignore.includes(".env.*") && gitignore.includes("backups/"), "segredos e backups estão ignorados");
assert(migrationNames.length > 0, "há migrations versionadas");
assert(migrationNames.every((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name)), "nomes de migrations são válidos");
assert(new Set(migrationNames.map((name) => name.slice(0, 14))).size === migrationNames.length, "timestamps de migrations são únicos");
assert(migrationNames.join("\n") === [...migrationNames].sort().join("\n"), "migrations estão em ordem cronológica");

if (production) {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  assert(url.startsWith("https://") && new URL(url).protocol === "https:", "URL Supabase de produção usa HTTPS");
  assert(key.startsWith("sb_publishable_") || key.startsWith("eyJ"), "chave pública Supabase está presente");
  assert(!process.env.SUPABASE_SERVICE_ROLE_KEY, "service role não está exposta ao build");
}

console.log(`Release ${rootPackage.version} validada (${checks.length} gates).`);
