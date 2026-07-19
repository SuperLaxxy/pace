const crypto = require('crypto');

/**
 * Encrypts plaintext using AES-256-CBC with a randomly generated IV.
 * @param {string|Buffer} plaintext - The data to encrypt.
 * @param {Buffer} keyEnc - The 32-byte encryption key.
 * @returns {Object} An object containing the IV and ciphertext, both as hex strings.
 */
function aesEncrypt(plaintext, keyEnc) {
  if (!keyEnc || keyEnc.length !== 32) {
    throw new Error('Key must be exactly 32 bytes for AES-256-CBC');
  }

  // Generate a random 16-byte IV for EVERY encryption (CRITICAL GUARDRAIL)
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv('aes-256-cbc', keyEnc, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    ciphertext: ciphertext
  };
}

/**
 * Decrypts ciphertext using AES-256-CBC.
 * @param {string} ivHex - The 16-byte IV as a hex string.
 * @param {string} ciphertextHex - The ciphertext as a hex string.
 * @param {Buffer} keyEnc - The 32-byte encryption key.
 * @returns {string} The decrypted plaintext as a utf8 string.
 */
function aesDecrypt(ivHex, ciphertextHex, keyEnc) {
  if (!keyEnc || keyEnc.length !== 32) {
    throw new Error('Key must be exactly 32 bytes for AES-256-CBC');
  }

  const iv = Buffer.from(ivHex, 'hex');
  if (iv.length !== 16) {
    throw new Error('IV must be exactly 16 bytes');
  }

  const decipher = crypto.createDecipheriv('aes-256-cbc', keyEnc, iv);
  
  let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

module.exports = {
  aesEncrypt,
  aesDecrypt
};
