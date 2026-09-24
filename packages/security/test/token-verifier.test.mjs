import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { verifyPlatformToken } from "../dist/index.js";

const secret = new TextEncoder().encode("test-signing-key-that-is-long-enough-for-hs256");
const keys = { resolveKey: async () => secret };
test("verifies explicit algorithm, issuer, audience, type, and scope", async () => {
  const token = await new SignJWT({ typ: "service", scope: "router:invoke" }).setProtectedHeader({ alg: "HS256", kid: "test" }).setIssuer("orin-core").setAudience("orin-router").setSubject("acct_test").setJti("jti_test").setIssuedAt().setExpirationTime("5m").sign(secret);
  const claims = await verifyPlatformToken(token, { issuer: "orin-core", audience: "orin-router", type: "service", requiredScopes: ["router:invoke"], algorithms: ["HS256"] }, keys);
  assert.equal(claims.typ, "service");
});
test("rejects wrong algorithm and scope", async () => {
  const token = await new SignJWT({ typ: "service", scope: "admin" }).setProtectedHeader({ alg: "HS256", kid: "test" }).setIssuer("orin-core").setAudience("orin-router").setSubject("acct_test").setJti("jti_test").setIssuedAt().setExpirationTime("5m").sign(secret);
  await assert.rejects(() => verifyPlatformToken(token, { issuer: "orin-core", audience: "orin-router", type: "service", requiredScopes: ["router:invoke"], algorithms: ["RS256"] }, keys));
  await assert.rejects(() => verifyPlatformToken(token, { issuer: "orin-core", audience: "orin-router", type: "service", requiredScopes: ["router:invoke"], algorithms: ["HS256"] }, keys));
});
