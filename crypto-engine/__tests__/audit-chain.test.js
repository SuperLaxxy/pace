const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { auditAppend } = require('../audit-chain');

test('Audit Chain Operations', (t) => {
  const keyAudit = crypto.randomBytes(32);

  t.test('should append and link entries correctly', () => {
    const data1 = "Event: Election Created";
    const mac1 = auditAppend(keyAudit, '', data1); // genesis block
    
    assert.ok(mac1.length > 0);
    
    const data2 = "Event: Voter Registered";
    const mac2 = auditAppend(keyAudit, mac1, data2);
    
    assert.ok(mac2.length > 0);
    assert.notStrictEqual(mac1, mac2);
  });

  t.test('should produce different mac if prevMac is manipulated', () => {
    const data = "Event: Some action";
    const prevMac = crypto.randomBytes(32).toString('hex');
    const manipulatedPrevMac = crypto.randomBytes(32).toString('hex');
    
    const macValid = auditAppend(keyAudit, prevMac, data);
    const macInvalid = auditAppend(keyAudit, manipulatedPrevMac, data);
    
    assert.notStrictEqual(macValid, macInvalid);
  });
});
