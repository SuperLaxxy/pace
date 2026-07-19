const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { authorizeAdmin, JWT_SECRET } = require('../middleware/auth');

// Pastikan ejaan folder 'crypto-engine' dan file di dalamnya menggunakan huruf kecil semua di GitHub
const { generateRsaKeypair, rsaUnwrapKey } = require('../../crypto-engine/rsa');
const { verifyBallot } = require('../../crypto-engine/ecdsa');
const { openBallot, serializeEnvelope } = require('../../crypto-engine/envelope');

const router = express.Router();

function verifyPassword(password, hashStr) {
  const [salt, key] = hashStr.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  try {
    const admin = db.prepare('SELECT id, username, password_hash FROM admins WHERE username = ?').get(username);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Perbaikan Jalur Otorisasi: Pastikan menggunakan 'router.use'
router.use(authorizeAdmin);

// POST /api/admin/elections
router.post('/elections', (req, res) => {
  const { title, start_at, end_at } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const { publicKey, privateKey } = generateRsaKeypair();

    const stmt = db.prepare('INSERT INTO elections (title, status, rsa_public_key_pem, start_at, end_at) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(title, 'draft', publicKey, start_at || null, end_at || null);

    res.status(201).json({
      message: 'Election created successfully',
      id: info.lastInsertRowid,
      privateKeyPem: privateKey
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/candidates
router.post('/candidates', (req, res) => {
  const { election_id, ballot_number, name, vision, photo_url } = req.body;
  if (!election_id || !name) {
    return res.status(400).json({ error: 'election_id and name are required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO candidates (election_id, ballot_number, name, vision, photo_url) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(election_id, ballot_number || null, name, vision || null, photo_url || null);
    res.status(201).json({ message: 'Candidate created', id: info.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/elections/:id/status
router.patch('/elections/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['draft', 'open', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const election = db.prepare('SELECT status FROM elections WHERE id = ?').get(req.params.id);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const currentStatus = election.status;
    const isValidTransition =
      (currentStatus === 'draft' && status === 'open') ||
      (currentStatus === 'open' && status === 'closed');

    if (!isValidTransition && currentStatus !== status) {
      return res.status(400).json({ error: `Invalid status transition from ${currentStatus} to ${status}` });
    }

    const stmt = db.prepare('UPDATE elections SET status = ? WHERE id = ?');
    stmt.run(status, req.params.id);
    res.json({ message: `Election status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/elections/:id/tally
router.post('/elections/:id/tally', (req, res) => {
  const electionId = req.params.id;
  const { privateKeyPem } = req.body;

  if (!privateKeyPem) {
    return res.status(400).json({ error: 'RSA private key is required for tallying' });
  }

  try {
    const election = db.prepare('SELECT status FROM elections WHERE id = ?').get(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    if (election.status !== 'closed') {
      return res.status(400).json({ error: 'Election must be closed before tallying' });
    }

    const ballots = db.prepare('SELECT * FROM ballots WHERE election_id = ?').all(electionId);

    let validCount = 0;
    let invalidCount = 0;
    const invalidBallots = [];
    const results = {};

    const candidates = db.prepare('SELECT id FROM candidates WHERE election_id = ?').all(electionId);
    candidates.forEach(c => results[c.id] = 0);

    for (const ballot of ballots) {
      try {
        const canonicalData = serializeEnvelope({
          electionId: ballot.election_id,
          wrappedKey: ballot.wrapped_key,
          iv: ballot.iv,
          ciphertext: ballot.ciphertext,
          tag: ballot.hmac_tag,
          nonce: ballot.nonce,
          timestamp: ballot.timestamp
        });

        if (!ballot.signer_pub_key) {
          throw new Error('Signer public key not found in ballot');
        }

        const isSigValid = verifyBallot(ballot.signer_pub_key, canonicalData, ballot.signature);
        if (!isSigValid) {
          throw new Error('Invalid signature');
        }

        const keyMaterial = rsaUnwrapKey(privateKeyPem, ballot.wrapped_key);
        const K_enc = keyMaterial.subarray(0, 32);
        const K_mac = keyMaterial.subarray(32, 64);

        const opened = openBallot({ iv: ballot.iv, ciphertext: ballot.ciphertext, tag: ballot.hmac_tag }, K_enc, K_mac);
        if (!opened.ok) {
          throw new Error('HMAC verification or decryption failed');
        }

        const candidateIdStr = opened.plaintext.trim();
        const candidateId = parseInt(candidateIdStr, 10);

        if (results[candidateId] !== undefined) {
          results[candidateId]++;
          validCount++;
        } else {
          throw new Error('Voted for unknown candidate');
        }

      } catch (err) {
        invalidCount++;
        invalidBallots.push({ ballotId: ballot.id, reason: err.message });
      }
    }

    res.json({
      validCount,
      invalidCount,
      results,
      invalidBallots
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/voters
router.get('/voters', (req, res) => {
  try {
    const voters = db.prepare('SELECT id, nim, name, is_active, has_voted FROM voters').all();
    res.json(voters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/voters/:id/activate
router.patch('/voters/:id/activate', (req, res) => {
  const { is_active } = req.body;
  try {
    db.prepare('UPDATE voters SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
    res.json({ message: 'Voter status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/elections
router.get('/elections', (req, res) => {
  try {
    const elections = db.prepare('SELECT id, title, status, start_at, end_at, created_at FROM elections').all();
    res.json(elections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/elections/:id
router.get('/elections/:id', (req, res) => {
  try {
    const election = db.prepare('SELECT id, title, status, start_at, end_at, created_at FROM elections WHERE id = ?').get(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    res.json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/elections/:id/candidates
router.get('/elections/:id/candidates', (req, res) => {
  try {
    const candidates = db.prepare('SELECT * FROM candidates WHERE election_id = ?').all(req.params.id);
    res.json(candidates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/audit-log
router.get('/audit-log', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_log ORDER BY seq ASC').all();
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/audit-log/verify
router.get('/audit-log/verify', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_log ORDER BY seq ASC').all();
    let prevMac = '0'.repeat(64);
    const keyAuditHex = process.env.AUDIT_KEY || '0'.repeat(64);
    const keyAudit = Buffer.from(keyAuditHex, 'hex');

    for (const log of logs) {
      if (log.prev_mac !== prevMac) {
        return res.json({ valid: false, brokenAtSeq: log.seq, reason: 'prev_mac mismatch' });
      }

      const expectedMac = crypto.createHmac('sha256', keyAudit)
        .update(Buffer.concat([Buffer.from(log.detail, 'utf8'), Buffer.from(prevMac, 'hex')]))
        .digest('hex');

      if (expectedMac !== log.mac) {
        return res.json({ valid: false, brokenAtSeq: log.seq, reason: 'mac mismatch' });
      }

      prevMac = log.mac;
    }

    res.json({ valid: true, brokenAtSeq: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
