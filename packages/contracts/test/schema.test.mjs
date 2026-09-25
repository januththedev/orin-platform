import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContractValidator } from "../dist/validation.js";

const root = new URL("../../../fixtures/v1/", import.meta.url);
async function fixture(kind, name) {
  return JSON.parse(await readFile(new URL(`${kind}/${name}`, root), "utf8"));
}
test("valid contract fixtures validate", async () => {
  assert.equal(createContractValidator("SearchRequestV1")(await fixture("valid", "search-request.json")), true);
  assert.equal(createContractValidator("CatalogModelV1")(await fixture("valid", "model-catalog-free.json")), true);
  assert.equal(createContractValidator("TokenClaimsV1")(await fixture("valid", "token-session.json")), true);
  assert.equal(createContractValidator("ErrorEnvelopeV1")(await fixture("valid", "error.json")), true);
  assert.equal(createContractValidator("ChatRequestV1")(await fixture("valid", "router-chat-request.json")), true);
  assert.equal(createContractValidator("SearchResultV1")(await fixture("valid", "search-result.json")), true);
  assert.equal(createContractValidator("EventEnvelopeV1")(await fixture("valid", "event.json")), true);
});
test("invalid contract fixtures fail", async () => {
  assert.equal(createContractValidator("SearchRequestV1")(await fixture("invalid", "search-query-too-long.json")), false);
  assert.equal(createContractValidator("TokenClaimsV1")(await fixture("invalid", "token-missing-exp.json")), false);
  assert.equal(createContractValidator("EventEnvelopeV1")(await fixture("invalid", "event-prompt-metadata.json")), false);
});
