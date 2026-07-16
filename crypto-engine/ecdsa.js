const crypto = require('crypto');

/**
 * Generates an ECDSA keypair using the P-256 curve.
 * @returns {Object} An object containing the publicKey and privateKey in PEM format.
 */
function generateEcdsaKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // Equivalent to P-256
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
 * Signs the ballot envelope data using ECDSA and SHA-256.
 * The envelope data typically contains IV, ciphertext, tag, nonce, and timestamp.
 * @param {string} privateKeyPem - The ECDSA private key in PEM format.
 * @param {string} envelopeData - The concatenated string of envelope properties.
 * @returns {string} The base64-encoded signature.
 */
function signBallot(privateKeyPem, envelopeData) {
  const sign = crypto.createSign('SHA256');
  sign.update(envelopeData);
  sign.end();
  const signature = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' }, 'base64');
  return signature;
}

/**
 * Verifies the ECDSA signature of the ballot envelope.
 * @param {string} publicKeyPem - The ECDSA public key in PEM format.
 * @param {string} envelopeData - The concatenated string of envelope properties.
 * @param {string} signatureBase64 - The base64-encoded signature to verify.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
function verifyBallot(publicKeyPem, envelopeData, signatureBase64) {
  const verify = crypto.createVerify('SHA256');
  verify.update(envelopeData);
  verify.end();
  return verify.verify({ key: publicKeyPem, dsaEncoding: 'ieee-p1363' }, signatureBase64, 'base64');
}

module.exports = {
  generateEcdsaKeypair,
  signBallot,
  verifyBallot
};
