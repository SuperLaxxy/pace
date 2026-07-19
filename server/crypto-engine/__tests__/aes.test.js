const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { aesEncrypt, aesDecrypt } = require('../aes');

test('AES-256-CBC Encryption and Decryption', (t) => {
  t.test('should encrypt and decrypt a message correctly', () => {
    const key = crypto.randomBytes(32);
    const plaintext = "Pilihan saya adalah Kandidat 1";
    
    const { iv, ciphertext } = aesEncrypt(plaintext, key);
    
    assert.strictEqual(iv.length, 32); // 16 bytes = 32 hex chars
    assert.ok(ciphertext.length > 0);
    assert.notStrictEqual(ciphertext, plaintext);
    
    const decrypted = aesDecrypt(iv, ciphertext, key);
    assert.strictEqual(decrypted, plaintext);
  });

  t.test('should generate different ciphertexts and IVs for the same plaintext (random IV check)', () => {
    const key = crypto.randomBytes(32);
    const plaintext = "Pilihan yang sama";
    
    const result1 = aesEncrypt(plaintext, key);
    const result2 = aesEncrypt(plaintext, key);
    
    assert.notStrictEqual(result1.iv, result2.iv);
    assert.notStrictEqual(result1.ciphertext, result2.ciphertext);
  });

  t.test('should throw an error if key length is not 32 bytes', () => {
    const invalidKey = crypto.randomBytes(16);
    const plaintext = "Test";
    
    assert.throws(() => {
      aesEncrypt(plaintext, invalidKey);
    }, /Key must be exactly 32 bytes/);
  });
});
