import test from "node:test";
import assert from "node:assert/strict";
import { NOTES_CONTRACT_VERSION, NOTES_PARSER_AVAILABLE } from "../dist/index.js";
test("notes namespace is reserved but has no parser", () => {
  assert.equal(NOTES_CONTRACT_VERSION, "0.0.0-reserved");
  assert.equal(NOTES_PARSER_AVAILABLE, false);
});
