import test from "node:test";
import assert from "node:assert/strict";
import { loadPlatformConfig, assertSecretPresence, ConfigError } from "../dist/index.js";

test("defaults are safe", () => {
  const config = loadPlatformConfig({}, "production");
  assert.equal(config.profile, "cloud");
  assert.equal(config.providerMode, "fake");
  assert.deepEqual(config.features, { identityV2: false, routerV2: false, searchV2: false, chatV2: false });
});
test("preview cannot use live providers", () => {
  assert.throws(() => loadPlatformConfig({ ORIN_PROVIDER_MODE: "live" }, "preview"), ConfigError);
});
test("invalid boolean fails instead of silently disabling", () => {
  assert.throws(() => loadPlatformConfig({ ORIN_FEATURE_CHAT_V2: "yes" }, "production"), ConfigError);
});
test("missing secret names are safe", () => {
  try {
    assertSecretPresence({}, ["ORIN_SIGNING_KEY", "DATABASE_URL"]);
    assert.fail("expected missing secret error");
  } catch (error) {
    assert.deepEqual(error.variableNames, ["ORIN_SIGNING_KEY", "DATABASE_URL"]);
    assert.equal(error.message.includes("value"), false);
  }
});
