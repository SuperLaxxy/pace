const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to hash password using scrypt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Helper to verify password using scrypt and timingSafeEqual
 */
function verifyPassword(password, hashStr) {
  const [salt, key] = hashStr.split(':');
  if (!salt || !key) return false;
  
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { nim, name, password } = req.body;
  
  if (!nim || !name || !password) {
    return res.status(400).json({ error: 'NIM, name, and password are required' });
  }

  try {
    const password_hash = hashPassword(password);
    const stmt = db.prepare('INSERT INTO voters (nim, name, password_hash) VALUES (?, ?, ?)');
    const info = stmt.run(nim, name, password_hash);
    
    res.status(201).json({ message: 'Voter registered successfully', id: info.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'NIM already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { nim, password } = req.body;
  
  if (!nim || !password) {
    return res.status(400).json({ error: 'NIM and password are required' });
  }

  try {
    const stmt = db.prepare('SELECT id, nim, password_hash, is_active FROM voters WHERE nim = ?');
    const voter = stmt.get(nim);

    if (!voter) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!verifyPassword(password, voter.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!voter.is_active) {
      return res.status(403).json({ error: 'Account not active. Please wait for admin validation.' });
    }

    const token = jwt.sign({ id: voter.id, nim: voter.nim }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, voter: { id: voter.id, nim: voter.nim, is_active: voter.is_active } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
