import test from "node:test";
import assert from "node:assert/strict";
import { isPublicAddress, validateOutboundUrl, normalizeResultLink, safeFetch } from "../dist/index.js";

const policy = {
  profile: "cloud",
  allowlist: [{ origin: "https://api.example.com", pathPrefixes: ["/v1"] }],
  maxRedirects: 2,
  connectTimeoutMs: 1000,
  totalTimeoutMs: 5000,
  maxResponseBytes: 1024,
  allowedContentTypes: ["application/json"],
};
const resolver = { resolveAll: async () => [{ address: "93.184.216.34", family: 4 }] };
test("rejects private and alternate addresses", () => {
  assert.equal(isPublicAddress("8.8.8.8"), true);
  for (const value of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1"]) assert.equal(isPublicAddress(value), false, value);
});
test("requires exact registry origin and path", async () => {
  await assert.rejects(() => validateOutboundUrl("https://evil.example/v1", policy, resolver));
  await assert.rejects(() => validateOutboundUrl("https://api.example.com/v1x", policy, resolver));
  await assert.doesNotReject(() => validateOutboundUrl("https://api.example.com/v1/models", policy, resolver));
});
test("rejects unsafe result links", () => {
  assert.equal(normalizeResultLink("https://example.com/result").protocol, "https:");
  for (const value of ["javascript:alert(1)", "file:///tmp/x", "http://127.0.0.1/x", "https://user:pass@example.com/x"]) assert.throws(() => normalizeResultLink(value));
});
test("safe fetch revalidates redirects", async () => {
  const calls = [];
  const requester = async (url) => {
    calls.push(url.toString());
    if (url.pathname === "/v1/start") return { status: 302, headers: { location: "https://api.example.com/v1/final" }, body: new Uint8Array(), url: url.toString() };
    return { status: 200, headers: { "content-type": "application/json" }, body: new TextEncoder().encode("{}"), url: url.toString() };
  };
  const response = await safeFetch("https://api.example.com/v1/start", {}, policy, requester, resolver);
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["https://api.example.com/v1/start", "https://api.example.com/v1/final"]);
});
