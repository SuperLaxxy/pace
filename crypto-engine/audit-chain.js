const crypto = require('crypto');

/**
 * Appends a new entry to the audit log chain.
 * Calculates mac_n = HMAC(K_audit, data_n || mac_{n-1}).
 * For the first entry, prevMac can be an empty string or a predefined genesis hash.
 * @param {Buffer} keyAudit - The MAC key for the audit chain.
 * @param {string} prevMacHex - The MAC of the previous entry as a hex string.
 * @param {string} data - The stringified data of the current event.
 * @returns {string} The new MAC as a hex string.
 */
function auditAppend(keyAudit, prevMacHex, data) {
  if (!keyAudit || keyAudit.length !== 32) {
    throw new Error('Audit key must be exactly 32 bytes');
  }

  const hmac = crypto.createHmac('sha256', keyAudit);
  
  const payload = Buffer.concat([
    Buffer.from(data, 'utf8'),
    Buffer.from(prevMacHex, 'hex') // For the genesis block, this will just be an empty buffer if prevMacHex is ''
  ]);

  hmac.update(payload);
  return hmac.digest('hex');
}

module.exports = {
  auditAppend
};
