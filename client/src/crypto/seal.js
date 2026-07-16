import { aesEncrypt } from './aes.js';
import { hmacTag } from './hmac.js';
import { rsaWrapKey } from './rsa.js';
import { signBallot } from './ecdsa.js';
import { serializeEnvelope } from './envelope.js';

/**
 * Seals a ballot by encrypting the candidate ID, generating an HMAC tag,
 * wrapping the symmetric keys with the KPU's public RSA key, and signing
 * the entire envelope with the voter's private ECDSA key.
 *
 * @param {string} candidateId - The ID of the chosen candidate.
 * @param {string} electionId - The ID of the election.
 * @param {string} kpuPubPem - The KPU's public RSA key in PEM format.
 * @param {CryptoKey} voterPrivKey - The voter's private ECDSA key.
 * @returns {Promise<Object>} An object containing the serialized envelope data and signature.
 */
export async function sealBallot(candidateId, electionId, kpuPubPem, voterPrivKey) {
  // Generate random 32-byte session keys
  const keyEncBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32)).buffer;
  const keyMacBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32)).buffer;

  // 1. Encrypt candidateId using AES-256-CBC
  const { iv, ciphertext } = await aesEncrypt(candidateId, keyEncBuffer);
  
  // 2. Generate HMAC tag
  const tag = await hmacTag(keyMacBuffer, iv, ciphertext);

  // 3. Wrap keys using RSA-OAEP
  const keyMaterialBuffer = new Uint8Array(64);
  keyMaterialBuffer.set(new Uint8Array(keyEncBuffer), 0);
  keyMaterialBuffer.set(new Uint8Array(keyMacBuffer), 32);
  const wrappedKey = await rsaWrapKey(kpuPubPem, keyMaterialBuffer.buffer);

  // 4. Construct envelope
  const envelope = {
    electionId,
    wrappedKey,
    iv,
    ciphertext,
    tag,
    nonce: Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join(''),
    timestamp: Date.now().toString()
  };

  // 5. Serialize envelope deterministically
  const envelopeData = serializeEnvelope(envelope);

  // 6. Sign envelope
  const signature = await signBallot(voterPrivKey, envelopeData);

  return {
    envelope,
    envelopeData,
    signature
  };
}
