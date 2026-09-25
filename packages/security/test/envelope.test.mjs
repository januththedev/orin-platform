import test from "node:test";
import assert from "node:assert/strict";
import { encryptSecret, decryptSecret } from "../dist/index.js";

const keys = {
  async currentKeyVersion() { return "v1"; },
  async wrapKey(dek) { return { keyVersion: "v1", wrappedKey: Uint8Array.from(dek).reverse() }; },
  async unwrapKey(wrapped) { return Uint8Array.from(wrapped).reverse(); },
};
test("envelope encryption round-trips and binds AAD", async () => {
  const record = await encryptSecret(new TextEncoder().encode("secret-value"), new TextEncoder().encode("provider:key"), keys);
  assert.equal(record.wrapped_key.length > 0, true);
  assert.equal(new TextDecoder().decode(await decryptSecret(record, new TextEncoder().encode("provider:key"), keys)), "secret-value");
  await assert.rejects(() => decryptSecret(record, new TextEncoder().encode("provider:other"), keys));
});
