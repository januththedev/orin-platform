import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const forbidden = [/gh[pousr]_[A-Za-z0-9_]{20,}/, /sk-[A-Za-z0-9]{20,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const extensions = new Set([".ts", ".js", ".mjs", ".json", ".md", ".sql", ".css"]);
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(extname(entry.name))) {
      const text = await readFile(path, "utf8");
      for (const pattern of forbidden) if (pattern.test(text)) throw new Error(`credential-shaped literal in ${path}`);
    }
  }
}
await walk(root);
console.log("secret scan passed");
