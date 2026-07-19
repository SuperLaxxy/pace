process.env.NODE_ENV = 'test';
process.env.AUDIT_KEY = '0'.repeat(64);
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../index');
const { db } = require('../db');
const { generateEcdsaKeypair, signBallot } = require('../../crypto-engine/ecdsa');
const { aesEncrypt } = require('../../crypto-engine/aes');
const { hmacTag } = require('../../crypto-engine/hmac');
const crypto = require('crypto');
const { serializeEnvelope } = require('../../crypto-engine/envelope');

// Since we use the same rsa.js on the server to wrap keys, we can also use publicEncrypt manually here if we want,
// but the client would normally just use publicEncrypt with the RSA public key.
function clientRsaWrapKey(publicKeyPem, keyMaterial) {
  return crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    keyMaterial
  ).toString('base64');
}

test('PACE Backend Integration Tests', async (t) => {
  // Clear DB
  db.exec('DELETE FROM audit_log; DELETE FROM used_nonces; DELETE FROM eligibility_log; DELETE FROM ballots; DELETE FROM candidates; DELETE FROM elections; DELETE FROM voters;');

  let adminToken;
  let voterId;
  let token;
  let rsaPublicKeyPem;
  let rsaPrivateKeyPem; // The KPU keeps this
  let electionId;
  let candidateId;
  let lastValidVoteEnvelope;
  const voterKeypair = generateEcdsaKeypair();

  await t.test('0. Admin Login', async () => {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync('password', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
    // Use INSERT OR IGNORE just in case db/index.js already seeded it from env
    db.prepare('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)').run('admin', `${salt}:${derivedKey}`);

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'password' })
      .expect(200);

    adminToken = res.body.token;
    assert.ok(adminToken);
  });

  await t.test('1. Setup Election and Candidates', async () => {
    // Create Election
    const resElec = await request(app)
      .post('/api/admin/elections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Pemilu Ketua BEM 2026' })
      .expect(201);

    electionId = resElec.body.id;
    rsaPrivateKeyPem = resElec.body.privateKeyPem; // KPU saves it offline
    assert.ok(rsaPrivateKeyPem);

    // Create Candidate
    const resCand = await request(app)
      .post('/api/admin/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ election_id: electionId, ballot_number: 1, name: 'Alice' })
      .expect(201);

    candidateId = resCand.body.id;

    // Open Election
    await request(app)
      .patch(`/api/admin/elections/${electionId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'open' })
      .expect(200);
  });

  await t.test('2. Register, Login, and Set Public Key', async () => {
    // Register
    const resReg = await request(app)
      .post('/api/auth/register')
      .send({ nim: '12345', name: 'Bob', password: 'password123' })
      .expect(201);

    // Activate voter via admin endpoint
    await request(app)
      .patch(`/api/admin/voters/${resReg.body.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: true })
      .expect(200);

    // Login
    const resLogin = await request(app)
      .post('/api/auth/login')
      .send({ nim: '12345', password: 'password123' })
      .expect(200);

    token = resLogin.body.token;
    voterId = resLogin.body.voter.id;

    // Set Public Key
    await request(app)
      .post('/api/voter/publickey')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicKeyPem: voterKeypair.publicKey })
      .expect(200);
  });

  await t.test('3. Happy Path: Cast a Valid Vote', async () => {
    // Fetch Election PubKey
    const resPubKey = await request(app)
      .get(`/api/elections/${electionId}/pubkey`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    rsaPublicKeyPem = resPubKey.body.publicKeyPem;
    assert.ok(rsaPublicKeyPem);

    // Prepare envelope
    const K_enc = crypto.randomBytes(32);
    const K_mac = crypto.randomBytes(32);
    const keyMaterial = Buffer.concat([K_enc, K_mac]);

    const plaintext = String(candidateId); // Pilihan kandidat
    const { iv, ciphertext } = aesEncrypt(plaintext, K_enc);
    const tag = hmacTag(K_mac, iv, ciphertext);
    const wrappedKey = clientRsaWrapKey(rsaPublicKeyPem, keyMaterial);

    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();

    lastValidVoteEnvelope = {
      electionId,
      wrappedKey,
      iv,
      ciphertext,
      tag,
      nonce,
      timestamp
    };

    const canonicalData = serializeEnvelope(lastValidVoteEnvelope);
    const signature = signBallot(voterKeypair.privateKey, canonicalData);

    const envelope = {
      ...lastValidVoteEnvelope,
      signature,
      signerPublicKeyId: voterId // matching db id for public key
    };

    const resVote = await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...envelope, candidateId })
      .expect(201);

    assert.ok(resVote.body.receiptHash);
  });

  await t.test('3.5. Replay Rejection', async () => {
    // Verify anti-replay: sending the exact same envelope should fail with replay error, not double-vote error.
    // We recreate the same envelope that was used in test 3.
    const canonicalData = serializeEnvelope({
      electionId,
      wrappedKey: lastValidVoteEnvelope.wrappedKey,
      iv: lastValidVoteEnvelope.iv,
      ciphertext: lastValidVoteEnvelope.ciphertext,
      tag: lastValidVoteEnvelope.tag,
      nonce: lastValidVoteEnvelope.nonce,
      timestamp: lastValidVoteEnvelope.timestamp
    });

    const signature = signBallot(voterKeypair.privateKey, canonicalData);

    const envelope = {
      ...lastValidVoteEnvelope,
      signature,
      signerPublicKeyId: voterId,
      candidateId
    };

    const res = await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send(envelope)
      .expect(400);

    assert.strictEqual(res.body.error, 'Replay detected: nonce already used');
  });

  await t.test('4. Double Vote Rejection', async () => {
    // Attempt another vote with different nonce/timestamp
    const K_enc = crypto.randomBytes(32);
    const K_mac = crypto.randomBytes(32);
    const keyMaterial = Buffer.concat([K_enc, K_mac]);
    const { iv, ciphertext } = aesEncrypt(String(candidateId), K_enc);
    const tag = hmacTag(K_mac, iv, ciphertext);
    const wrappedKey = clientRsaWrapKey(rsaPublicKeyPem, keyMaterial);
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();

    const canonicalData = serializeEnvelope({ electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp });
    const signature = signBallot(voterKeypair.privateKey, canonicalData);

    await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${token}`)
      .send({ electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp, signature, signerPublicKeyId: voterId, candidateId })
      .expect(400); // Double vote detected
  });

  await t.test('5. Forged Signature Rejection', async () => {
    // Create new voter to try and vote
    const resRegEve = await request(app).post('/api/auth/register').send({ nim: '99999', name: 'Eve', password: 'pwd' });
    await request(app).patch(`/api/admin/voters/${resRegEve.body.id}/activate`).set('Authorization', `Bearer ${adminToken}`).send({ is_active: true }).expect(200);
    const resEve = await request(app).post('/api/auth/login').send({ nim: '99999', password: 'pwd' });
    const eveToken = resEve.body.token;
    const eveId = resEve.body.voter.id;

    // Eve sets her public key
    const eveKeypair = generateEcdsaKeypair();
    await request(app)
      .post('/api/voter/publickey')
      .set('Authorization', `Bearer ${eveToken}`)
      .send({ publicKeyPem: eveKeypair.publicKey });

    const K_enc = crypto.randomBytes(32);
    const K_mac = crypto.randomBytes(32);
    const keyMaterial = Buffer.concat([K_enc, K_mac]);
    const { iv, ciphertext } = aesEncrypt(String(candidateId), K_enc);
    const tag = hmacTag(K_mac, iv, ciphertext);
    const wrappedKey = clientRsaWrapKey(rsaPublicKeyPem, keyMaterial);
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();

    const canonicalData = serializeEnvelope({ electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp });

    // Eve signs with HER key, but claims to be Bob (signerPublicKeyId: voterId)
    // Wait, the API checks signerPublicKeyId against req.user.id. Eve is logged in as Eve, so she MUST send her own signerPublicKeyId.
    // If she sends her own signerPublicKeyId, she just casts her own valid vote.
    // If she modifies canonicalData AFTER signing...
    const badSignature = 'forged_base64_string_xyz=';

    await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${eveToken}`)
      .send({ electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp, signature: badSignature, signerPublicKeyId: eveId, candidateId })
      .expect(400); // Invalid signature
  });

  await t.test('6. Tally and Tamper Detection', async () => {
    // First, let's cast a second valid vote so we have 2 ballots.
    const resRegMal = await request(app).post('/api/auth/register').send({ nim: '88888', name: 'Mallory', password: 'pwd' });
    await request(app).patch(`/api/admin/voters/${resRegMal.body.id}/activate`).set('Authorization', `Bearer ${adminToken}`).send({ is_active: true }).expect(200);
    const resMal = await request(app).post('/api/auth/login').send({ nim: '88888', password: 'pwd' });
    const malToken = resMal.body.token;
    const malId = resMal.body.voter.id;
    const malKeypair = generateEcdsaKeypair();
    await request(app).post('/api/voter/publickey').set('Authorization', `Bearer ${malToken}`).send({ publicKeyPem: malKeypair.publicKey }).expect(200);

    // Mallory casts vote
    const K_enc = crypto.randomBytes(32);
    const K_mac = crypto.randomBytes(32);
    const { iv, ciphertext } = aesEncrypt(String(candidateId), K_enc);
    const tag = hmacTag(K_mac, iv, ciphertext);
    const wrappedKey = clientRsaWrapKey(rsaPublicKeyPem, Buffer.concat([K_enc, K_mac]));
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();
    const canonicalData = serializeEnvelope({ electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp });
    const signature = signBallot(malKeypair.privateKey, canonicalData);

    await request(app)
      .post(`/api/elections/${electionId}/vote`)
      .set('Authorization', `Bearer ${malToken}`)
      .send({ electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp, signature, signerPublicKeyId: malId, candidateId })
      .expect(201);

    // Close election
    await request(app)
      .patch(`/api/admin/elections/${electionId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'closed' })
      .expect(200);

    // Now we have 2 valid votes. Let's tamper with one.
    const ballotToTamper = db.prepare('SELECT id, ciphertext FROM ballots LIMIT 1').get();
    const modifiedCiphertext = '00' + ballotToTamper.ciphertext.substring(2); // flip first byte
    db.prepare('UPDATE ballots SET ciphertext = ? WHERE id = ?').run(modifiedCiphertext, ballotToTamper.id);

    // Tally
    const resTally = await request(app)
      .post(`/api/admin/elections/${electionId}/tally`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ privateKeyPem: rsaPrivateKeyPem })
      .expect(200);

    // 1 Valid, 1 Invalid
    assert.strictEqual(resTally.body.validCount, 1);
    assert.strictEqual(resTally.body.invalidCount, 1);
    assert.strictEqual(resTally.body.results[candidateId], 1);
    assert.strictEqual(resTally.body.invalidBallots[0].ballotId, ballotToTamper.id);
    assert.match(resTally.body.invalidBallots[0].reason, /HMAC_INVALID|signature|HMAC verification/);
    // Actually, signature verification will fail FIRST because the canonicalData includes the modified ciphertext!
    // This is a great property of signing the envelope.
  });
});
