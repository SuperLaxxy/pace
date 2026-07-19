const crypto = require('crypto');

/**
 * Generates an HMAC-SHA256 tag for the given IV and ciphertext.
 * Implements Encrypt-then-MAC: tag = HMAC(key, iv || ciphertext).
 * @param {Buffer} keyMac - The 32-byte MAC key.
 * @param {string} ivHex - The 16-byte IV as a hex string.
 * @param {string} ciphertextHex - The ciphertext as a hex string.
 * @returns {string} The HMAC-SHA256 tag as a hex string.
 */
function hmacTag(keyMac, ivHex, ciphertextHex) {
  if (!keyMac || keyMac.length !== 32) {
    throw new Error('MAC key must be exactly 32 bytes');
  }

  const hmac = crypto.createHmac('sha256', keyMac);
  
  // Concatenate iv and ciphertext strings (both are hex encoded)
  // Ensure that we hash the combined string or buffer
  // Note: we can hash the raw bytes by converting hex to buffer, or just hash the hex strings.
  // Converting to buffer is more standard for cryptographic payload.
  const payload = Buffer.concat([
    Buffer.from(ivHex, 'hex'),
    Buffer.from(ciphertextHex, 'hex')
  ]);

  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verifies the HMAC-SHA256 tag using a timing-safe equality check.
 * @param {Buffer} keyMac - The 32-byte MAC key.
 * @param {string} ivHex - The 16-byte IV as a hex string.
 * @param {string} ciphertextHex - The ciphertext as a hex string.
 * @param {string} tagHex - The provided HMAC-SHA256 tag as a hex string.
 * @returns {boolean} True if the tag is valid, false otherwise.
 */
function hmacVerify(keyMac, ivHex, ciphertextHex, tagHex) {
  const expectedTagHex = hmacTag(keyMac, ivHex, ciphertextHex);
  
  const expectedTagBuf = Buffer.from(expectedTagHex, 'hex');
  const providedTagBuf = Buffer.from(tagHex, 'hex');

  if (expectedTagBuf.length !== providedTagBuf.length) {
    return false;
  }

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(expectedTagBuf, providedTagBuf);
}

module.exports = {
  hmacTag,
  hmacVerify
};
