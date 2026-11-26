import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "portal");
const target = path.join(root, "dist", "portal");

if (!existsSync(source)) {
  console.error("[copy-portal] Missing static portal folder:", source);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

console.log("[copy-portal] Copied portal -> dist/portal");
