import test from "node:test";
import assert from "node:assert/strict";
import { createEvent, redactMetadata, withRequiredEvent } from "../dist/index.js";

test("event envelope has stable required fields", () => {
  const event = createEvent({ type: "orin.test.event", product: "orin-test", source: { service: "test", component: "unit" }, requestId: "req_123456789", traceId: "0123456789abcdef0123456789abcdef", correlationId: "corr_123456789", outcome: "succeeded" });
  assert.equal(event.schema_version, "1.0.0");
  assert.equal(event.session_id, null);
  assert.equal(event.redacted_metadata.alias, undefined);
});
test("redaction removes sensitive keys recursively at the envelope boundary", () => {
  assert.deepEqual(redactMetadata({ prompt: "secret", query: "secret", alias: "orin-cheap", count: 2 }), { alias: "orin-cheap", count: 2 });
});
test("required event append occurs before operation", async () => {
  const order = [];
  await withRequiredEvent({ append: async () => { order.push("append"); return { eventId: "event" }; } }, {}, async () => { order.push("operation"); return 1; });
  assert.deepEqual(order, ["append", "operation"]);
});
test("required event failure prevents operation", async () => {
  let called = false;
  await assert.rejects(() => withRequiredEvent({ append: async () => { throw new Error("db down"); } }, {}, async () => { called = true; }));
  assert.equal(called, false);
});
