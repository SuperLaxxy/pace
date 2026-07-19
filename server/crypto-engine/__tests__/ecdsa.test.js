const test = require('node:test');
const assert = require('node:assert');
const { generateEcdsaKeypair, signBallot, verifyBallot } = require('../ecdsa');

test('ECDSA Signature Generation and Verification', (t) => {
  t.test('should sign and verify envelope correctly', () => {
    const { publicKey, privateKey } = generateEcdsaKeypair();
    
    const envelopeData = "iv_data|ciphertext_data|tag_data|nonce_123|ts_123456789";
    
    const signature = signBallot(privateKey, envelopeData);
    assert.ok(signature.length > 0);
    
    const isValid = verifyBallot(publicKey, envelopeData, signature);
    assert.strictEqual(isValid, true);
  });

  t.test('should reject signature if envelope is manipulated', () => {
    const { publicKey, privateKey } = generateEcdsaKeypair();
    
    const envelopeData = "iv_data|ciphertext_data|tag_data|nonce_123|ts_123456789";
    const signature = signBallot(privateKey, envelopeData);
    
    const manipulatedData = "iv_data|ciphertext_data|tag_data|nonce_124|ts_123456789";
    
    const isValid = verifyBallot(publicKey, manipulatedData, signature);
    assert.strictEqual(isValid, false);
  });

  t.test('should reject signature from a different keypair', () => {
    const { privateKey } = generateEcdsaKeypair();
    const { publicKey: wrongPublicKey } = generateEcdsaKeypair();
    
    const envelopeData = "test_data";
    const signature = signBallot(privateKey, envelopeData);
    
    const isValid = verifyBallot(wrongPublicKey, envelopeData, signature);
    assert.strictEqual(isValid, false);
  });
});
