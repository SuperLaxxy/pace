import { arrayBufferToBase64 } from './helpers.js';

export async function generateEcdsaKeypair() {
  return await globalThis.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true, // Extractable so we can export and save to keystore
    ['sign', 'verify']
  );
}

/**
 * Signs the ballot envelope data using ECDSA and SHA-256.
 * @param {CryptoKey} privateKey - The ECDSA private key.
 * @param {string} envelopeDataStr - The canonical string of envelope properties.
 * @returns {Promise<string>} The base64-encoded signature (IEEE-P1363 format).
 */
export async function signBallot(privateKey, envelopeDataStr) {
  const data = new TextEncoder().encode(envelopeDataStr);
  const signatureBuffer = await globalThis.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    data
  );
  
  // Web Crypto API natively outputs IEEE-P1363 format (raw r||s)
  return arrayBufferToBase64(signatureBuffer);
}

/**
 * Exports a public key to SPKI PEM format to be sent to the backend.
 * @param {CryptoKey} publicKey - The ECDSA public key.
 * @returns {Promise<string>} The PEM string.
 */
export async function exportPublicKeySpkiPem(publicKey) {
  const spkiBuffer = await globalThis.crypto.subtle.exportKey('spki', publicKey);
  const base64 = arrayBufferToBase64(spkiBuffer);
  
  const formatted = base64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----\n`;
}
