/**
 * Crypto bridge for the server UI (iframe).
 *
 * Encrypt/decrypt/verify only — signing is delegated to the parent
 * shell via the PostMessage bridge (secret key never leaves parent).
 */

import {
  encrypt,
  decrypt,
  checkVerifyBlob,
  verify,
  deriveKey,
  toHex,
  fromHex,
  fromBase58,
} from "@concord/crypto";

/** Cache of derived encryption keys: salt → keyBytes */
const keyCache = new Map<string, Uint8Array>();

export async function getOrDeriveKey(
  password: string,
  salt: string
): Promise<Uint8Array> {
  const cacheKey = `${password}:${salt}`;
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  const key = await deriveKey(password, salt);
  keyCache.set(cacheKey, key);
  return key;
}

export async function encryptMessage(
  plaintext: string,
  realmKey: Uint8Array | null,
  channelKey: Uint8Array | null
): Promise<{ encrypted: string; nonce: string }> {
  let data = plaintext;
  let nonce = "";

  if (channelKey) {
    const inner = await encrypt(data, channelKey);
    data = inner.ciphertext;
    nonce = inner.nonce;
  }

  if (realmKey) {
    const outer = await encrypt(data, realmKey);
    if (channelKey) {
      return { encrypted: outer.ciphertext, nonce: `${outer.nonce}:${nonce}` };
    }
    return { encrypted: outer.ciphertext, nonce: outer.nonce };
  }

  if (channelKey) {
    return { encrypted: data, nonce };
  }

  return { encrypted: plaintext, nonce: "" };
}

export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  realmKey: Uint8Array | null,
  channelKey: Uint8Array | null
): Promise<string> {
  let data = ciphertext;

  if (realmKey) {
    const nonces = nonce.split(":");
    const realmNonce = nonces[0];
    data = await decrypt(data, realmNonce, realmKey);

    if (channelKey && nonces[1]) {
      data = await decrypt(data, nonces[1], channelKey);
    }
  } else if (channelKey && nonce) {
    data = await decrypt(data, nonce, channelKey);
  }

  return data;
}

export function verifyMessage(
  ciphertext: string,
  signatureHex: string,
  publicKeyBase58: string
): boolean {
  try {
    const signature = fromHex(signatureHex);
    const publicKey = fromBase58(publicKeyBase58);
    return verify(ciphertext, signature, publicKey);
  } catch {
    return false;
  }
}

const VERIFY_SALT = "concord:verify";

export async function verifyPassword(
  password: string,
  verifyCiphertext: string,
  verifyNonce: string
): Promise<boolean> {
  const key = await getOrDeriveKey(password, VERIFY_SALT);
  return checkVerifyBlob(verifyCiphertext, verifyNonce, key);
}

export { toHex, fromHex } from "@concord/crypto";
