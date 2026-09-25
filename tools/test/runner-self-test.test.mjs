import test from "node:test";
import assert from "node:assert/strict";

test("workspace exposes contract version 1.0.0", async () => {
  const version = await import("../../packages/contracts/dist/version.js");
  assert.equal(version.PLATFORM_CONTRACT_VERSION, "1.0.0");
});
