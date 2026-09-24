import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../styles/", import.meta.url));
test("UI tokens and accessibility rules exist", async () => {
  const tokens = await readFile(`${root}tokens.css`, "utf8");
  const primitives = await readFile(`${root}primitives.css`, "utf8");
  assert.match(tokens, /--orin-accent/);
  assert.match(tokens, /prefers-reduced-motion/);
  assert.match(primitives, /:focus-visible/);
  assert.doesNotMatch(tokens, /url\(/);
});
