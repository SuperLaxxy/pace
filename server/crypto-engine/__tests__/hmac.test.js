const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { hmacTag, hmacVerify } = require('../hmac');

test('HMAC-SHA256 Generation and Verification', (t) => {
  const keyMac = crypto.randomBytes(32);
  const ivHex = crypto.randomBytes(16).toString('hex');
  const ciphertextHex = Buffer.from('dummy_ciphertext').toString('hex');

  t.test('should generate and verify a valid tag', () => {
    const tag = hmacTag(keyMac, ivHex, ciphertextHex);
    assert.ok(tag.length > 0);
    
    const isValid = hmacVerify(keyMac, ivHex, ciphertextHex, tag);
    assert.strictEqual(isValid, true);
  });

  t.test('should reject tag if ciphertext is manipulated (1 byte changed)', () => {
    const tag = hmacTag(keyMac, ivHex, ciphertextHex);
    
    // Manipulate ciphertext
    let manipulatedCiphertextHex = ciphertextHex;
    // Change the first character of the hex string
    const firstChar = manipulatedCiphertextHex[0] === 'a' ? 'b' : 'a';
    manipulatedCiphertextHex = firstChar + manipulatedCiphertextHex.slice(1);
    
    const isValid = hmacVerify(keyMac, ivHex, manipulatedCiphertextHex, tag);
    assert.strictEqual(isValid, false);
  });

  t.test('should reject tag if IV is manipulated', () => {
    const tag = hmacTag(keyMac, ivHex, ciphertextHex);
    
    const manipulatedIvHex = crypto.randomBytes(16).toString('hex');
    
    const isValid = hmacVerify(keyMac, manipulatedIvHex, ciphertextHex, tag);
    assert.strictEqual(isValid, false);
  });

  t.test('should reject an invalid tag', () => {
    const tag = hmacTag(keyMac, ivHex, ciphertextHex);
    const manipulatedTag = tag.substring(0, tag.length - 1) + (tag[tag.length - 1] === '0' ? '1' : '0');
    
    const isValid = hmacVerify(keyMac, ivHex, ciphertextHex, manipulatedTag);
    assert.strictEqual(isValid, false);
  });
});
