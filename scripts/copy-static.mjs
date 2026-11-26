import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "archive", "legacy-static");
const target = path.join(root, "dist", "archive", "legacy-static");

if (!existsSync(source)) {
  console.error("[copy-static] Missing static pages folder:", source);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

console.log("[copy-static] Copied static portal -> dist/archive/legacy-static");
