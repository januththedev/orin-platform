import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const registry = JSON.parse(await readFile(join(root, "schemas/registry.v1.json"), "utf8"));
const seen = new Set();
for (const entry of registry.schemas) {
  if (seen.has(entry.id)) throw new Error(`duplicate schema id ${entry.id}`);
  seen.add(entry.id);
  const schema = JSON.parse(await readFile(join(root, entry.path), "utf8"));
  if (schema.$id !== entry.id) throw new Error(`schema id mismatch for ${entry.path}`);
}
console.log(`validated ${seen.size} schema ids`);
