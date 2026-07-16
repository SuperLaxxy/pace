-- Pemilih
CREATE TABLE IF NOT EXISTS voters (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nim           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,        -- scrypt hash
  public_key_jwk TEXT,                -- ECDSA public key pemilih
  has_voted     INTEGER DEFAULT 0,    -- anti double-vote
  is_active     INTEGER DEFAULT 0,    -- divalidasi admin
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pemilu
CREATE TABLE IF NOT EXISTS elections (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  status         TEXT CHECK(status IN ('draft','open','closed')) DEFAULT 'draft',
  rsa_public_key_pem TEXT,            -- kunci publik pemilu (enkripsi suara)
  start_at       DATETIME,
  end_at         DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kandidat
CREATE TABLE IF NOT EXISTS candidates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id   INTEGER REFERENCES elections(id),
  ballot_number INTEGER,
  name          TEXT NOT NULL,
  vision        TEXT,
  photo_url     TEXT
);

-- KOTAK SUARA  (sengaja TANPA voter_id → menjaga ballot secrecy)
CREATE TABLE IF NOT EXISTS ballots (
  id               TEXT PRIMARY KEY,   -- UUID acak
  election_id      INTEGER REFERENCES elections(id),
  wrapped_key      TEXT NOT NULL,      -- RSA-OAEP(K_enc‖K_mac)
  iv               TEXT NOT NULL,
  ciphertext       TEXT NOT NULL,      -- AES-CBC
  hmac_tag         TEXT NOT NULL,      -- HMAC-SHA256
  signature        TEXT NOT NULL,      -- ECDSA
  signer_pub_key   TEXT NOT NULL,      -- Store the actual public key string for tally verification
  nonce            TEXT NOT NULL,
  timestamp        TEXT NOT NULL,      -- Client-signed timestamp
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Catatan partisipasi (TERPISAH dari isi suara)
CREATE TABLE IF NOT EXISTS eligibility_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id     INTEGER REFERENCES voters(id),
  election_id  INTEGER REFERENCES elections(id),
  voted_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  receipt_hash TEXT NOT NULL,
  UNIQUE(voter_id, election_id) -- Ensures 1 vote per election per voter at DB level
);

-- Audit log anti-tampering (rantai HMAC)
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  seq        INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  detail     TEXT NOT NULL,
  prev_mac   TEXT NOT NULL,
  mac        TEXT NOT NULL,            -- HMAC(detail ‖ prev_mac)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Anti-replay
CREATE TABLE IF NOT EXISTS used_nonces (
  nonce      TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

