require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const crypto = require('crypto');
const { db } = require('../db');

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminUsername || !adminPassword) {
  console.error('Error: ADMIN_USERNAME and ADMIN_PASSWORD must be defined in .env');
  process.exit(1);
}

const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get(adminUsername);
if (existingAdmin) {
  console.log(`Admin account '${adminUsername}' already exists. No action taken.`);
} else {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(adminPassword, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  const password_hash = `${salt}:${derivedKey}`;
  
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(adminUsername, password_hash);
  console.log(`Successfully created admin account: '${adminUsername}'`);
}
