const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { generateRsaKeypair, rsaWrapKey, rsaUnwrapKey } = require('../rsa');

test('RSA-OAEP Key Wrapping and Unwrapping', (t) => {
  t.test('should generate a keypair, wrap, and unwrap key material correctly', () => {
    const { publicKey, privateKey } = generateRsaKeypair();
    
    assert.ok(publicKey.includes('BEGIN PUBLIC KEY'));
    assert.ok(privateKey.includes('BEGIN PRIVATE KEY'));
    
    // Simulate wrapping K_enc || K_mac (32 + 32 = 64 bytes)
    const kEnc = crypto.randomBytes(32);
    const kMac = crypto.randomBytes(32);
    const keyMaterial = Buffer.concat([kEnc, kMac]);
    
    const wrappedBase64 = rsaWrapKey(publicKey, keyMaterial);
    assert.ok(wrappedBase64.length > 0);
    
    const unwrappedBuffer = rsaUnwrapKey(privateKey, wrappedBase64);
    
    assert.strictEqual(Buffer.compare(keyMaterial, unwrappedBuffer), 0, 'Unwrapped key material should match exactly');
  });

  t.test('should fail to unwrap with a different private key', () => {
    const { publicKey } = generateRsaKeypair();
    const { privateKey: wrongPrivateKey } = generateRsaKeypair();
    
    const keyMaterial = crypto.randomBytes(64);
    const wrappedBase64 = rsaWrapKey(publicKey, keyMaterial);
    
    assert.throws(() => {
      rsaUnwrapKey(wrongPrivateKey, wrappedBase64);
    });
  });
});
