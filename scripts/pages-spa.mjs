import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const index = join(dist, "index.html");

if (!existsSync(index)) {
  console.error("dist/index.html missing — run vite build first");
  process.exit(1);
}

writeFileSync(join(dist, ".nojekyll"), "");
copyFileSync(index, join(dist, "404.html"));

for (const dir of ["studio", "studio/login", "studio/dashboard", "studio/templates", "s"]) {
  const target = join(dist, dir);
  mkdirSync(target, { recursive: true });
  copyFileSync(index, join(target, "index.html"));
}

console.log("GitHub Pages SPA fallbacks written (404.html, studio/*, .nojekyll)");
