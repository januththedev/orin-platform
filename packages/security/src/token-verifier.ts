import { jwtVerify } from "jose";

type VerificationKey = Uint8Array | CryptoKey;
export interface TokenKeyResolver { resolveKey(kid: string, algorithm: string): Promise<VerificationKey>; }
export interface TokenExpectation { readonly issuer: string; readonly audience: string; readonly type: string; readonly requiredScopes: readonly string[]; readonly algorithms: readonly string[]; readonly maxTokenAgeSeconds?: number; }
export async function verifyPlatformToken(token: string, expectation: TokenExpectation, keys: TokenKeyResolver, now = new Date()): Promise<Record<string, unknown>> {
  const header = decodeProtectedHeader(token);
  if (!expectation.algorithms.includes(header.alg)) throw new Error("token algorithm is not allowed");
  const key = await keys.resolveKey(header.kid ?? "", header.alg);
  const verified = await jwtVerify(token, key as Uint8Array, { issuer: expectation.issuer, audience: expectation.audience, algorithms: [...expectation.algorithms] as never });
  if (verified.payload.typ !== expectation.type) throw new Error("token type mismatch");
  if (typeof verified.payload.exp !== "number" || verified.payload.exp * 1000 <= now.getTime()) throw new Error("token expired");
  const scopes = String(verified.payload.scope ?? "").split(/\s+/).filter(Boolean);
  for (const scope of expectation.requiredScopes) if (!scopes.includes(scope)) throw new Error("required scope missing");
  return verified.payload as Record<string, unknown>;
}
function decodeProtectedHeader(token: string): { alg: string; kid?: string } {
  const part = token.split(".")[0];
  if (!part) throw new Error("malformed token");
  const header = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { alg?: string; kid?: string };
  if (!header.alg) throw new Error("token algorithm missing");
  return { alg: header.alg, kid: header.kid };
}
