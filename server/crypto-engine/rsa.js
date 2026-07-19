const crypto = require('crypto');

/**
 * Generates an RSA keypair for the election (min 2048-bit).
 * The public key is used to encrypt (wrap) the AES and MAC keys.
 * The private key is kept offline by the KPU.
 * @returns {Object} An object containing the publicKey and privateKey in PEM format.
 */
function generateRsaKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

/**
 * Wraps key material (e.g., K_enc || K_mac) using RSA-OAEP.
 * @param {string} publicKeyPem - The RSA public key in PEM format.
 * @param {Buffer} keyMaterial - The symmetric keys to wrap (e.g., 64 bytes total).
 * @returns {string} The wrapped key as a base64 string.
 */
function rsaWrapKey(publicKeyPem, keyMaterial) {
  const wrapped = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256', // good practice to specify hash for OAEP
    },
    keyMaterial
  );
  return wrapped.toString('base64');
}

/**
 * Unwraps key material using RSA-OAEP.
 * @param {string} privateKeyPem - The RSA private key in PEM format.
 * @param {string} wrappedKeyBase64 - The wrapped key as a base64 string.
 * @returns {Buffer} The unwrapped symmetric key material.
 */
function rsaUnwrapKey(privateKeyPem, wrappedKeyBase64) {
  const wrappedBuf = Buffer.from(wrappedKeyBase64, 'base64');
  const unwrapped = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    wrappedBuf
  );
  return unwrapped;
}

module.exports = {
  generateRsaKeypair,
  rsaWrapKey,
  rsaUnwrapKey
};
