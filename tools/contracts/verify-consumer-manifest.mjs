import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(await readFile(process.argv[2] ?? join(root, "orin-platform.consumer.json"), "utf8"));
const deferred = new Set(["mcp", "router.key-management", "tools.run", "@orin/notes/parser"]);
for (const name of manifest.deferred_exports ?? []) if (!deferred.has(name)) throw new Error(`unknown deferred export ${name}`);
for (const name of manifest.required_exports ?? []) if (deferred.has(name)) throw new Error(`deferred export required: ${name}`);
console.log(`consumer manifest ${manifest.consumer} verified`);
