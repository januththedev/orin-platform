import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(await readFile(new URL("../../../product/manifest.v1.json", import.meta.url), "utf8"));
test("only four first-slice products are active integrations", () => {
  const firstSlice = manifest.products.filter((product) => product.integration === "first-slice").map((product) => product.id).sort();
  assert.deepEqual(firstSlice, ["orin-ai", "orin-platform", "orin-router-service", "orin-tools"]);
  for (const product of manifest.products.filter((entry) => entry.integration === "contract-only")) assert.equal(product.minimum_client_version, null);
});
