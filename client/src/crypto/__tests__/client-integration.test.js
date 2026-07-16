import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

// Set env variables BEFORE dynamically importing the backend app.
// This prevents hoisting from loading the app without JWT_SECRET.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.AUDIT_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

// Now dynamically import app to avoid hoisting issues, ensuring env vars are present
const { default: app } = await import('../../../../server/index.js');
const { db } = await import('../../../../server/db/index.js');
const { generateRsaKeypair } = await import('../../../../crypto-engine/rsa.js');

// Client modules can be imported statically since they don't depend on server env vars
import { generateEcdsaKeypair, exportPublicKeySpkiPem } from '../ecdsa.js';
import { sealBallot } from '../seal.js';

let server;
let baseUrl;

test('Integration Test: Client Web Crypto with M2 Server', async (t) => {
  // Clear DB from previous tests just to be safe
  db.exec('DELETE FROM audit_log; DELETE FROM used_nonces; DELETE FROM eligibility_log; DELETE FROM ballots; DELETE FROM candidates; DELETE FROM elections; DELETE FROM voters;');

  // 1. Boot up the server
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const request = async (method, path, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  try {
    // 2. Register Voter
    const nim = '12345678';
    const password = 'securepassword123';
    await request('POST', '/api/auth/register', { nim, name: 'Web Crypto Voter', password });

    // Activate voter manually in DB
    db.prepare('UPDATE voters SET is_active = 1 WHERE nim = ?').run(nim);

    // 3. Login Voter
    const loginRes = await request('POST', '/api/auth/login', { nim, password });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed');
    const token = loginRes.data.token;
    assert.ok(token, 'Token should be returned');

    // 4. Generate Client Keys and Submit Public Key
    const voterKeypair = await generateEcdsaKeypair();
    const voterPubPem = await exportPublicKeySpkiPem(voterKeypair.publicKey);
    
    const pubKeyRes = await request('POST', '/api/voter/publickey', { publicKeyPem: voterPubPem }, token);
    assert.strictEqual(pubKeyRes.status, 200, 'Submitting public key should succeed');

    // 5. Admin: Create Election and Candidate
    // Use crypto-engine directly to generate KPU RSA key
    const { publicKey: kpuPubPem } = generateRsaKeypair();
    
    const insertElection = db.prepare('INSERT INTO elections (title, status, rsa_public_key_pem) VALUES (?, ?, ?)');
    const info = insertElection.run('Integration Test Election', 'open', kpuPubPem);
    const electionId = info.lastInsertRowid.toString();

    const candidateId = "42"; 
    db.prepare('INSERT INTO candidates (id, election_id, name) VALUES (?, ?, ?)').run(candidateId, electionId, 'Test Candidate');

    // 6. Client: Fetch Election PubKey
    const elecRes = await request('GET', `/api/elections/${electionId}/pubkey`, null, token);
    assert.strictEqual(elecRes.status, 200, 'Fetching election pubkey should succeed');
    assert.strictEqual(elecRes.data.publicKeyPem, kpuPubPem, 'Public key should match');

    // 7. Client: Seal Ballot
    const { envelope, signature } = await sealBallot(candidateId, electionId, kpuPubPem, voterKeypair.privateKey);

    let signerPublicKeyId = loginRes.data.user?.id;
    if (!signerPublicKeyId) {
      const userRecord = db.prepare('SELECT id FROM voters WHERE nim = ?').get(nim);
      signerPublicKeyId = userRecord.id;
    }

    const payload = {
      ...envelope,
      signature,
      signerPublicKeyId
    };

    // 8. Client: Submit Vote
    const voteRes = await request('POST', `/api/elections/${electionId}/vote`, payload, token);
    assert.strictEqual(voteRes.status, 201, `Vote submission should succeed. Got: ${JSON.stringify(voteRes.data)}`);
    assert.ok(voteRes.data.receiptHash, 'Should return a receipt hash');

    // 9. Admin: Verify ballot was stored properly without relying on http tally
    const ballots = db.prepare('SELECT * FROM ballots WHERE election_id = ?').all(electionId);
    assert.strictEqual(ballots.length, 1, 'Should have 1 ballot saved');
    assert.strictEqual(ballots[0].signer_pub_key, voterPubPem, 'Saved pub key should match the voter public key');

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
