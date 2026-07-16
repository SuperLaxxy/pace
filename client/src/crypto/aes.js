import { arrayBufferToHex, hexToArrayBuffer } from './helpers.js';

export async function aesEncrypt(plaintext, keyEncBuffer) {
  if (keyEncBuffer.byteLength !== 32) {
    throw new Error('Key must be exactly 32 bytes for AES-256-CBC');
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyEncBuffer,
    'AES-CBC',
    false,
    ['encrypt']
  );

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv: iv
    },
    key,
    encodedPlaintext
  );

  return {
    iv: arrayBufferToHex(iv.buffer),
    ciphertext: arrayBufferToHex(ciphertextBuffer)
  };
}

export async function aesDecrypt(ivHex, ciphertextHex, keyEncBuffer) {
  if (keyEncBuffer.byteLength !== 32) {
    throw new Error('Key must be exactly 32 bytes for AES-256-CBC');
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyEncBuffer,
    'AES-CBC',
    false,
    ['decrypt']
  );

  const iv = hexToArrayBuffer(ivHex);
  const ciphertext = hexToArrayBuffer(ciphertextHex);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: new Uint8Array(iv)
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}
