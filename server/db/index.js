const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(__dirname, 'pace.db');

const db = new Database(dbPath, {
  // verbose: console.log
});

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema if not exists
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);


// Helper for transactions
const transaction = (cb) => {
  const tx = db.transaction(cb);
  return tx();
};

module.exports = {
  db,
  transaction
};
