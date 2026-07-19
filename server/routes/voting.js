const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');
const { verifyBallot } = require('../crypto-engine/ecdsa');
const { serializeEnvelope } = require('../crypto-engine/envelope');
const { auditAppend } = require('../crypto-engine/audit-chain');

const router = express.Router();

const AUDIT_KEY = process.env.AUDIT_KEY;
if (!AUDIT_KEY) {
  console.error('CRITICAL: AUDIT_KEY is not defined in environment variables.');
  process.exit(1);
}
const auditKeyBuffer = Buffer.from(AUDIT_KEY, 'hex');
if (auditKeyBuffer.length !== 32) {
  console.error('CRITICAL: AUDIT_KEY must be exactly 32 bytes (64 hex characters).');
  process.exit(1);
}

// GET /api/stats/public — angka agregat AMAN untuk landing (tanpa auth).
// TIDAK mengembalikan suara real-time, timestamp, atau identitas apa pun.
router.get('/stats/public', (req, res) => {
  try {
    const voters = db.prepare('SELECT COUNT(*) AS n FROM voters').get().n;
    const elections = db.prepare('SELECT COUNT(*) AS n FROM elections').get().n;
    const closed = db.prepare("SELECT COUNT(*) AS n FROM elections WHERE status = 'closed'").get().n;
    const votesClosed = db.prepare(`
      SELECT COUNT(*) AS n FROM ballots b
      JOIN elections e ON e.id = b.election_id
      WHERE e.status = 'closed'
    `).get().n;
    res.json({ voters, elections, closedElections: closed, votesClosed });
  } catch (e) {
    res.status(500).json({ error: 'stats unavailable' });
  }
});

// GET /api/elections/active
router.get('/elections/active', authenticate, (req, res) => {
  try {
    const election = db.prepare('SELECT id, title, status FROM elections WHERE status = ? LIMIT 1').get('open');
    if (!election) {
      return res.status(404).json({ error: 'No active election found' });
    }
    res.json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections
router.get('/elections', authenticate, (req, res) => {
  try {
    const elections = db.prepare('SELECT id, title, status FROM elections WHERE status = ?').all('open');
    res.json({ elections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/:id/candidates
router.get('/elections/:id/candidates', authenticate, (req, res) => {
  try {
    const candidates = db.prepare('SELECT id, ballot_number, name, vision, photo_url FROM candidates WHERE election_id = ? ORDER BY ballot_number ASC').all(req.params.id);
    res.json({ candidates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/:id/pubkey
router.get('/elections/:id/pubkey', authenticate, (req, res) => {
  try {
    const election = db.prepare('SELECT rsa_public_key_pem FROM elections WHERE id = ?').get(req.params.id);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    res.json({ publicKeyPem: election.rsa_public_key_pem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/elections/:id/vote
router.post('/elections/:id/vote', authenticate, (req, res) => {
  const electionId = req.params.id;
  const voterId = req.user.id;
  const { wrappedKey, iv, ciphertext, tag, nonce, timestamp, signature, signerPublicKeyId, candidateId } = req.body;

  if (!wrappedKey || !iv || !ciphertext || !tag || !nonce || !timestamp || !signature || !signerPublicKeyId) {
    return res.status(400).json({ error: 'Incomplete envelope' });
  }

  const isHex = (str) => /^[0-9a-fA-F]+$/.test(str);
  const isBase64 = (str) => /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/.test(str);

  if (!isHex(iv) || !isHex(ciphertext) || !isHex(tag)) {
    return res.status(400).json({ error: 'Invalid format: iv, ciphertext, and tag must be hex strings' });
  }
  if (!isBase64(wrappedKey) || !isBase64(signature)) {
    return res.status(400).json({ error: 'Invalid format: wrappedKey and signature must be base64 strings' });
  }

  try {
    // 1. Check if election is open
    const election = db.prepare('SELECT status FROM elections WHERE id = ?').get(electionId);
    if (!election || election.status !== 'open') {
      return res.status(400).json({ error: 'Election is not open for voting' });
    }

    // 1b. Validate candidate ID
    if (!candidateId) {
      return res.status(400).json({ error: 'Candidate ID is required' });
    }
    const candidateRow = db.prepare('SELECT id FROM candidates WHERE id = ? AND election_id = ?').get(candidateId, electionId);
    if (!candidateRow) {
      return res.status(400).json({ error: 'Kandidat tidak valid' });
    }

    // 2. Fetch voter's public key (to verify signature)
    // The client sends signerPublicKeyId, which we match to the voter's id just to be sure it's them.
    if (String(signerPublicKeyId) !== String(voterId)) {
      return res.status(400).json({ error: 'Signer ID mismatch' });
    }

    const voterRow = db.prepare('SELECT public_key_jwk, is_active FROM voters WHERE id = ?').get(voterId);
    if (!voterRow || !voterRow.public_key_jwk) {
      return res.status(400).json({ error: 'Voter public key not registered' });
    }
    if (!voterRow.is_active) {
      return res.status(403).json({ error: 'Voter account is not active' });
    }

    // 3. Verify ECDSA signature using canonicial serializeEnvelope
    const envelopeForVerify = {
      electionId,
      wrappedKey,
      iv,
      ciphertext,
      tag,
      nonce,
      timestamp
    };
    
    let canonicalData;
    try {
      canonicalData = serializeEnvelope(envelopeForVerify);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!verifyBallot(voterRow.public_key_jwk, canonicalData, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 4. Calculate receipt hash (SHA-256 of canonical data + signature)
    const hashInput = canonicalData + signature;
    const receiptHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // 5. Execute transaction
    transaction(() => {
      // 5a. Check anti-replay nonce
      const existingNonce = db.prepare('SELECT nonce FROM used_nonces WHERE nonce = ?').get(nonce);
      if (existingNonce) {
        throw new Error('REPLAY_DETECTED');
      }

      // 5b. Check eligibility_log (anti double-vote)
      const existingVote = db.prepare('SELECT id FROM eligibility_log WHERE voter_id = ? AND election_id = ?').get(voterId, electionId);
      if (existingVote) {
        throw new Error('DOUBLE_VOTE_DETECTED');
      }

      // 5c. Insert ballot (NO voter_id!)
      const ballotId = uuidv4();
      const insertBallot = db.prepare(`
        INSERT INTO ballots (id, election_id, wrapped_key, iv, ciphertext, hmac_tag, signature, signer_pub_key, nonce, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      // Store the actual public key in the ballot box to preserve anonymity (no voter_id reference)
      insertBallot.run(ballotId, electionId, wrappedKey, iv, ciphertext, tag, signature, voterRow.public_key_jwk, nonce, timestamp);

      // 5d. Insert eligibility log
      const insertEligibility = db.prepare('INSERT INTO eligibility_log (voter_id, election_id, receipt_hash) VALUES (?, ?, ?)');
      insertEligibility.run(voterId, electionId, receiptHash);

      // 5e. Set voter has_voted = 1
      db.prepare('UPDATE voters SET has_voted = 1 WHERE id = ?').run(voterId);

      // 5f. Insert nonce
      db.prepare('INSERT INTO used_nonces (nonce) VALUES (?)').run(nonce);

      // 5g. Append to audit_log
      const lastAudit = db.prepare('SELECT mac, seq FROM audit_log ORDER BY id DESC LIMIT 1').get();
      const GENESIS_MAC = '0'.repeat(64);
      const prevMac = lastAudit ? lastAudit.mac : GENESIS_MAC;
      const seq = lastAudit ? lastAudit.seq + 1 : 1;
      
      const auditDetail = JSON.stringify({ event: 'VOTE_CAST', electionId, ballotId, receiptHash });
      const newMac = auditAppend(auditKeyBuffer, prevMac, auditDetail);
      
      db.prepare('INSERT INTO audit_log (seq, event_type, detail, prev_mac, mac) VALUES (?, ?, ?, ?, ?)').run(
        seq, 'VOTE_CAST', auditDetail, prevMac, newMac
      );
    });

    // 6. Return receipt
    res.status(201).json({ receiptHash });

  } catch (error) {
    if (error.message === 'REPLAY_DETECTED') {
      return res.status(400).json({ error: 'Replay detected: nonce already used' });
    }
    if (error.message === 'DOUBLE_VOTE_DETECTED') {
      return res.status(400).json({ error: 'Voter has already voted in this election' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/voter/receipt
router.get('/voter/receipt', authenticate, (req, res) => {
  try {
    const receipts = db.prepare('SELECT election_id, receipt_hash, voted_at FROM eligibility_log WHERE voter_id = ?').all(req.user.id);
    res.json({ receipts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/voter/publickey
router.post('/voter/publickey', authenticate, (req, res) => {
  const { publicKeyPem } = req.body;
  
  if (!publicKeyPem) {
    return res.status(400).json({ error: 'publicKeyPem is required' });
  }

  try {
    const voter = db.prepare('SELECT public_key_jwk, has_voted FROM voters WHERE id = ?').get(req.user.id);
    if (voter.public_key_jwk) {
      return res.status(400).json({ error: 'Public key already set' });
    }
    if (voter.has_voted) {
      return res.status(400).json({ error: 'Cannot set public key after voting' });
    }

    const stmt = db.prepare('UPDATE voters SET public_key_jwk = ? WHERE id = ?');
    stmt.run(publicKeyPem, req.user.id);
    
    res.json({ message: 'Public key stored successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
