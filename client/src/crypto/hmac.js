import { hexToArrayBuffer, arrayBufferToHex } from './helpers.js';

/**
 * Generates an HMAC-SHA256 tag for the given IV and ciphertext.
 * The MAC is computed over the raw bytes: iv || ciphertext
 */
export async function hmacTag(keyMacBuffer, ivHex, ciphertextHex) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyMacBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const ivBytes = new Uint8Array(hexToArrayBuffer(ivHex));
  const ctBytes = new Uint8Array(hexToArrayBuffer(ciphertextHex));
  
  const data = new Uint8Array(ivBytes.length + ctBytes.length);
  data.set(ivBytes, 0);
  data.set(ctBytes, ivBytes.length);

  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    data
  );

  return arrayBufferToHex(signature);
}

export async function hmacVerify(keyMacBuffer, ivHex, ciphertextHex, expectedTagHex) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyMacBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const ivBytes = new Uint8Array(hexToArrayBuffer(ivHex));
  const ctBytes = new Uint8Array(hexToArrayBuffer(ciphertextHex));
  
  const data = new Uint8Array(ivBytes.length + ctBytes.length);
  data.set(ivBytes, 0);
  data.set(ctBytes, ivBytes.length);

  const signatureToVerify = hexToArrayBuffer(expectedTagHex);

  return await globalThis.crypto.subtle.verify(
    'HMAC',
    key,
    signatureToVerify,
    data
  );
}
