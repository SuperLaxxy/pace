const test = require('node:test');
const request = require('supertest');
const app = require('./index');
const crypto = require('crypto');
const { generateEcdsaKeypair, signBallot } = require('../crypto-engine/ecdsa');
const { aesEncrypt } = require('../crypto-engine/aes');
const { hmacTag } = require('../crypto-engine/hmac');
const { serializeEnvelope } = require('../crypto-engine/envelope');
const { db } = require('./db');

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

test('Test invalid candidate ID vote', async () => {
  // We need an open election
  const election = db.prepare('SELECT id, rsa_public_key_pem FROM elections WHERE status = \'open\' LIMIT 1').get();
  if (!election) throw new Error("No open election");

  // We need a logged in voter
  const voterKeypair = generateEcdsaKeypair();
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync('pwd', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  const nim = 'TEST12345' + Date.now();
  
  const insertVoter = db.prepare('INSERT INTO voters (nim, name, password_hash, is_active) VALUES (?, ?, ?, 1)');
  const voterInfo = insertVoter.run(nim, 'Test', `${salt}:${derivedKey}`);
  const voterId = voterInfo.lastInsertRowid;

  const resLogin = await request(app)
    .post('/api/auth/login')
    .send({ nim: nim, password: 'pwd' })
    .expect(200);
  const token = resLogin.body.token;

  await request(app)
    .post('/api/voter/publickey')
    .set('Authorization', `Bearer ${token}`)
    .send({ publicKeyPem: voterKeypair.publicKey })
    .expect(200);

  // VOTE WITH INVALID CANDIDATE ID = 9999
  const K_enc = crypto.randomBytes(32);
  const K_mac = crypto.randomBytes(32);
  const keyMaterial = Buffer.concat([K_enc, K_mac]);

  const plaintext = "9999"; // INVALID CANDIDATE
  const { iv, ciphertext } = aesEncrypt(plaintext, K_enc);
  const tag = hmacTag(K_mac, iv, ciphertext);
  const wrappedKey = clientRsaWrapKey(election.rsa_public_key_pem, keyMaterial);
  
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();

  const envelope = {
    electionId: election.id,
    wrappedKey,
    iv,
    ciphertext,
    tag,
    nonce,
    timestamp
  };

  const canonicalData = serializeEnvelope(envelope);
  const signature = signBallot(voterKeypair.privateKey, canonicalData);

  const payload = {
    ...envelope,
    signature,
    signerPublicKeyId: voterId
  };

  const voteRes = await request(app)
    .post(`/api/elections/${election.id}/vote`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  
  console.log("Status:", voteRes.status);
  console.log("Body:", voteRes.body);
});
