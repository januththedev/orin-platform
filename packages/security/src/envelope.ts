import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface KeyEncryptionProvider { currentKeyVersion(): Promise<string>; wrapKey(dek: Uint8Array, aad: Uint8Array): Promise<{ keyVersion: string; wrappedKey: Uint8Array }>; unwrapKey(wrappedKey: Uint8Array, keyVersion: string, aad: Uint8Array): Promise<Uint8Array>; }
export interface EncryptedSecretV1 { readonly ciphertext: string; readonly iv: string; readonly auth_tag: string; readonly wrapped_key: string; readonly key_version: string; }
export async function encryptSecret(plaintext: Uint8Array, aad: Uint8Array, keys: KeyEncryptionProvider): Promise<EncryptedSecretV1> {
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const wrapped = await keys.wrapKey(dek, aad);
  return { ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), auth_tag: cipher.getAuthTag().toString("base64url"), wrapped_key: Buffer.from(wrapped.wrappedKey).toString("base64url"), key_version: wrapped.keyVersion };
}
export async function decryptSecret(record: EncryptedSecretV1, aad: Uint8Array, keys: KeyEncryptionProvider): Promise<Uint8Array> {
  const dek = await keys.unwrapKey(Buffer.from(record.wrapped_key, "base64url"), record.key_version, aad);
  const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(record.iv, "base64url"));
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(record.auth_tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64url")), decipher.final()]);
}
