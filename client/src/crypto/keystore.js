import { arrayBufferToBase64, base64ToArrayBuffer, arrayBufferToHex, hexToArrayBuffer } from './helpers.js';

async function getPasswordKey(password) {
  const enc = new TextEncoder();
  return await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
}

async function deriveAesGcmKey(passwordKey, saltBuffer) {
  return await globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/**
 * Encrypts and stores the ECDSA private key using a password.
 * @param {CryptoKey} privateKey 
 * @param {string} password 
 * @param {string} [voterId]
 * @returns {Promise<string>} The JSON string of the encrypted payload (for backup).
 */
export async function storePrivateKey(privateKey, password, voterId) {
  const passwordKey = await getPasswordKey(password);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await deriveAesGcmKey(passwordKey, salt);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const wrappedKeyBuffer = await globalThis.crypto.subtle.wrapKey(
    'pkcs8',
    privateKey,
    aesKey,
    { name: 'AES-GCM', iv: iv }
  );

  const payload = {
    salt: arrayBufferToHex(salt.buffer),
    iv: arrayBufferToHex(iv.buffer),
    wrappedKey: arrayBufferToBase64(wrappedKeyBuffer)
  };

  const payloadStr = JSON.stringify(payload);
  if (typeof localStorage !== 'undefined') {
    if (!voterId) throw new Error("voterId is required to store private key");
    const keyName = `pace_voter_private_key_${voterId}`;
    localStorage.setItem(keyName, payloadStr);
  }
  return payloadStr; 
}

/**
 * Loads and decrypts the ECDSA private key.
 * @param {string} password 
 * @param {string} [payloadStr] Optional. If not provided, reads from localStorage.
 * @param {string} [voterId] Optional.
 * @returns {Promise<CryptoKey>}
 */
export async function loadPrivateKey(password, payloadStr, voterId) {
  if (!payloadStr && typeof localStorage !== 'undefined') {
    if (!voterId) throw new Error("voterId is required to load private key from localStorage");
    const keyName = `pace_voter_private_key_${voterId}`;
    payloadStr = localStorage.getItem(keyName);
  }
  if (!payloadStr) throw new Error("No private key found");

  const payload = JSON.parse(payloadStr);
  const salt = hexToArrayBuffer(payload.salt);
  const iv = hexToArrayBuffer(payload.iv);
  const wrappedKeyBuffer = base64ToArrayBuffer(payload.wrappedKey);

  const passwordKey = await getPasswordKey(password);
  const aesKey = await deriveAesGcmKey(passwordKey, salt);

  return await globalThis.crypto.subtle.unwrapKey(
    'pkcs8',
    wrappedKeyBuffer,
    aesKey,
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}
