import { arrayBufferToBase64 } from './helpers.js';

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/(-----(BEGIN|END) [A-Z ]+-----|\n|\r)/g, '');
  const binary_string = globalThis.atob(b64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Wraps symmetric keys using RSA-OAEP with SHA-256.
 * @param {string} publicKeyPem - The RSA public key in PEM format (SPKI).
 * @param {ArrayBuffer} keyMaterialBuffer - The symmetric keys to wrap (e.g. K_enc || K_mac).
 * @returns {Promise<string>} The base64-encoded wrapped key.
 */
export async function rsaWrapKey(publicKeyPem, keyMaterialBuffer) {
  const spkiBuffer = pemToArrayBuffer(publicKeyPem);

  const publicKey = await globalThis.crypto.subtle.importKey(
    'spki',
    spkiBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    keyMaterialBuffer
  );

  return arrayBufferToBase64(encryptedBuffer);
}
