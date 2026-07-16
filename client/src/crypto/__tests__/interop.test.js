import test from 'node:test';
import assert from 'node:assert';

// Backend (crypto-engine) imports
import { generateRsaKeypair, rsaUnwrapKey } from '../../../../crypto-engine/rsa.js';
import { verifyBallot as serverVerifyBallot } from '../../../../crypto-engine/ecdsa.js';
import { openBallot, serializeEnvelope as serverSerializeEnvelope } from '../../../../crypto-engine/envelope.js';

// Frontend (client Web Crypto API) imports
import { generateEcdsaKeypair, exportPublicKeySpkiPem } from '../ecdsa.js';
import { sealBallot } from '../seal.js';
import { serializeEnvelope as clientSerializeEnvelope } from '../envelope.js';
import { arrayBufferToHex } from '../helpers.js';

test('Interop: Web Crypto Client to Node Crypto Server', async (t) => {
  // 1. SETUP SERVER KEYS (Admin/KPU)
  const { publicKey: kpuPubPem, privateKey: kpuPrivPem } = generateRsaKeypair();

  // 2. SETUP CLIENT KEYS (Voter)
  const voterKeypair = await generateEcdsaKeypair();
  const voterPubPem = await exportPublicKeySpkiPem(voterKeypair.publicKey);

  // 3. VOTING FLOW (Client-side)
  const candidateId = "42";
  const electionId = "elec-123";
  const nonce = "random-nonce-abc";
  const timestamp = Date.now();

  // Use sealBallot
  const { envelope, envelopeData: envelopeDataClient, signature } = await sealBallot(
    candidateId,
    electionId,
    kpuPubPem,
    voterKeypair.privateKey
  );
  
  const envelopeDataServer = serverSerializeEnvelope(envelope);
  
  assert.strictEqual(envelopeDataClient, envelopeDataServer, 'Serialization must exactly match');

  // 4. VERIFICATION FLOW (Server-side / KPU Tallying)
  
  // Verify ECDSA signature
  const isValidSignature = serverVerifyBallot(voterPubPem, envelopeDataServer, signature);
  assert.strictEqual(isValidSignature, true, 'Signature from client must be valid on server');

  // Unwrap keys
  const unwrappedMaterial = rsaUnwrapKey(kpuPrivPem, envelope.wrappedKey);
  const serverKeyEnc = unwrappedMaterial.subarray(0, 32);
  const serverKeyMac = unwrappedMaterial.subarray(32, 64);

  // Asserts for keys match are skipped since K_enc and K_mac are generated inside sealBallot 
  // We just verify openBallot successfully decrypts the candidateId.
  const result = openBallot({ iv: envelope.iv, ciphertext: envelope.ciphertext, tag: envelope.tag }, serverKeyEnc, serverKeyMac);
  assert.strictEqual(result.ok, true, 'Ballot must open successfully without HMAC or decrypt errors');
  assert.strictEqual(result.plaintext, candidateId, 'Decrypted plaintext must match the original candidate ID');
});
