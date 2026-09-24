import test from "node:test";
import assert from "node:assert/strict";
import { assertExactScopes, isCatalogEntryEligible, MCP_SCOPES } from "../dist/index.js";

test("MCP scopes must be exact", () => {
  assert.doesNotThrow(() => assertExactScopes("usage:read chat:generate models:read", MCP_SCOPES));
  assert.throws(() => assertExactScopes("models:read chat:generate usage:read admin", MCP_SCOPES));
  assert.throws(() => assertExactScopes("models:read chat:generate", MCP_SCOPES));
});
test("catalog eligibility is free-only and fresh", () => {
  const now = new Date("2026-09-24T12:00:00Z");
  const model = { fetched_at: "2026-09-24T11:00:00Z", source_status: "success", capabilities: ["text"], prices: { prompt: 0, completion: 0, image: 0 } };
  assert.equal(isCatalogEntryEligible(model, "text", now), true);
  assert.equal(isCatalogEntryEligible({ ...model, prices: { ...model.prices, prompt: 1 } }, "text", now), false);
  assert.equal(isCatalogEntryEligible({ ...model, fetched_at: "2026-09-23T00:00:00Z" }, "text", now), false);
});
