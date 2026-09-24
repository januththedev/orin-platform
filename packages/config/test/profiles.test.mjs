import test from "node:test";
import assert from "node:assert/strict";
import { loadPlatformConfig } from "../dist/index.js";

test("profiles accept only declared values", () => {
  assert.equal(loadPlatformConfig({ ORIN_RUNTIME_PROFILE: "local" }, "development").profile, "local");
  assert.throws(() => loadPlatformConfig({ ORIN_RUNTIME_PROFILE: "edge" }, "development"));
});
test("flags require explicit boolean syntax", () => {
  const config = loadPlatformConfig({ ORIN_FEATURE_IDENTITY_V2: "1", ORIN_FEATURE_ROUTER_V2: "true" }, "test");
  assert.equal(config.features.identityV2, true);
  assert.equal(config.features.routerV2, true);
  assert.equal(config.features.searchV2, false);
});
