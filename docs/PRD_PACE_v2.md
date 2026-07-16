# Product Requirements Document (PRD)
# PACE — Papua Cyber Election

> Sistem E-Voting Aman untuk Komisi Pemilihan Umum Mahasiswa

| | |
|---|---|
| **Produk** | PACE (Papua Cyber Election) |
| **Tema** | Tema C — E-Voting / Secure Transaction System |
| **Mata Kuliah** | Kriptografi — Kelompok 5 |
| **Tahun** | 2026 |
| **Versi** | 2.0 |
| **Status** | Draft untuk implementasi |

---

## Daftar Isi
1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Personas & Aktor](#3-personas--aktor)
4. [Requirements](#4-requirements)
5. [Core Features](#5-core-features)
6. [User Flow](#6-user-flow)
7. [System Architecture](#7-system-architecture)
8. [Cryptographic Design](#8-cryptographic-design)
9. [Database Schema](#9-database-schema)
10. [API Design](#10-api-design)
11. [Tech Stack](#11-tech-stack)
12. [Security & Threat Model](#12-security--threat-model)
13. [Milestones & Roadmap](#13-milestones--roadmap)
14. [Risks & Open Questions](#14-risks--open-questions)
15. [Appendix — Pemetaan ke Laporan](#15-appendix--pemetaan-ke-laporan)

---

## 1. Overview

### 1.1 Ringkasan
PACE (Papua Cyber Election) adalah platform pemungutan suara elektronik untuk Pemilu Raya Mahasiswa yang diselenggarakan KPU Mahasiswa. PACE menggantikan surat suara kertas dengan sistem digital yang keamanannya bertumpu pada **kriptografi terverifikasi**, bukan pada kepercayaan terhadap panitia.

### 1.2 Problem Statement
Pemilu mahasiswa konvensional rentan terhadap surat suara ganda, manipulasi penghitungan oleh panitia, hilangnya kerahasiaan pilihan, dan ketiadaan jejak audit. Digitalisasi naif justru memperburuknya — satu query SQL bisa mengubah ribuan suara, dan satu admin nakal bisa membaca semua pilihan. PACE memindahkan titik kepercayaan dari "panitia jujur" ke "kriptografi yang dapat diverifikasi siapa pun".

### 1.3 Value Proposition
Empat jaminan keamanan inti:

| Properti | Arti | Dijamin oleh |
|---|---|---|
| **Confidentiality** | Tak ada pihak (termasuk admin) bisa membaca suara sebelum penghitungan | AES + RSA key-wrapping |
| **Integrity** | Perubahan data suara terdeteksi otomatis | HMAC-SHA256 |
| **Authentication & Non-repudiation** | Hanya pemilih sah; suara tak bisa disangkal | ECDSA digital signature |
| **Ballot Secrecy** | Siapa-memilih-siapa tak bisa dikorelasi | Pemisahan arsitektural data |

### 1.4 Scope
Target skala: pemilu kampus (ratusan–ribuan pemilih). Bukan untuk skala pemilu nasional. Detail di [Goals & Non-Goals](#2-goals--non-goals).

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Pemilih sah memberikan **tepat satu** suara yang terenkripsi dan tertanda tangan.
- Tidak ada pihak yang bisa membaca isi suara sebelum penghitungan resmi KPU.
- Setiap manipulasi data suara di basis data terdeteksi otomatis.
- Penghitungan terverifikasi (cek signature + HMAC sebelum dekripsi).
- Audit log anti-tampering (hash-chained) untuk forensik.
- Pemilih menerima receipt sebagai bukti suara masuk tanpa membocorkan pilihan.

### 2.2 Non-Goals
- ❌ Verifikasi biometrik / integrasi KTP-Dukcapil (pemilih diverifikasi via NIM + akun tervalidasi admin).
- ❌ Skala jutaan pemilih / infrastruktur HA produksi.
- ❌ *Receipt-freeness* & *coercion-resistance* penuh (anti jual-beli/pemaksaan suara) — masalah riset terbuka, diakui di BAB 7.
- ❌ Kriptografi pasca-kuantum — disebut sebagai future work.
- ❌ Anonimitas kriptografis sempurna (blind signature / mixnet / homomorphic) — kita capai pemisahan arsitektural & jelaskan batasnya.

> Mendaftarkan Non-Goals secara eksplisit = menunjukkan pemahaman batas sistem. Saat penyerang (BAB 4) menemukan "celah" yang sudah dinyatakan Non-Goal, argumen Anda menang.

---

## 3. Personas & Aktor

| Aktor | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Pemilih (Mahasiswa)** | Mahasiswa dengan NIM valid | Login aman, lihat kandidat, memilih sekali, dapat receipt |
| **Admin / KPU** | Panitia penyelenggara | Kelola pemilu & kandidat, validasi pemilih, buka/tutup, hitung |
| **Auditor** *(opsional)* | Pengawas independen | Verifikasi integritas log & kotak suara tanpa bisa dekripsi |
| **Attacker** | Kelompok peer-review (BAB 4) | Bukan pengguna sah — lihat Threat Model |

---

## 4. Requirements

### 4.1 Functional Requirements

**Pemilih**
- FR-1 — Registrasi/login dengan NIM + password.
- FR-2 — Pembangkitan pasangan kunci ECDSA di browser saat aktivasi akun; public key ke server, private key tetap di klien (terenkripsi password).
- FR-3 — Menampilkan daftar kandidat (nomor urut, nama, foto, visi-misi).
- FR-4 — Memilih tepat satu kandidat; suara kedua ditolak.
- FR-5 — Enkripsi + tanda tangan surat suara di sisi klien sebelum dikirim.
- FR-6 — Menerima receipt (hash surat suara) untuk verifikasi keterikutsertaan.

**Admin / KPU**
- FR-7 — Membuat pemilu (judul, periode) + membangkitkan pasangan kunci RSA pemilu.
- FR-8 — CRUD kandidat.
- FR-9 — Validasi & aktivasi daftar pemilih.
- FR-10 — Buka / tutup masa pemungutan suara.
- FR-11 — Penghitungan terverifikasi: verify signature → verify HMAC → decrypt → tally; suara gagal-verifikasi ditandai invalid & dilaporkan.
- FR-12 — Lihat & ekspor audit log + hasil akhir.

**Auditor (opsional)**
- FR-13 — Verifikasi rantai integritas audit log tanpa akses dekripsi.
- FR-14 — Verifikasi jumlah surat suara = jumlah pemilih yang tercatat "sudah memilih".

### 4.2 Non-Functional Requirements
- NFR-1 **Security** — HTTPS/TLS, prepared statements, rate limiting, security headers, validasi input.
- NFR-2 **Transparency** — hanya primitif kripto bawaan (Node `crypto` + Web Crypto API); tanpa library "ajaib" pihak ketiga, agar dapat dipertahankan saat review.
- NFR-3 **Usability** — alur memilih ≤ 3 langkah; UI Bahasa Indonesia; responsif di mobile.
- NFR-4 **Auditability** — seluruh aksi penting tercatat di audit log.
- NFR-5 **Portability** — jalan lokal (`npm run dev`) + terdokumentasi untuk cloud; rahasia via `.env`.
- NFR-6 **Performance** — verifikasi + tally untuk ribuan suara selesai dalam waktu wajar (bukan target utama).

---

## 5. Core Features

| # | Fitur | Deskripsi singkat | Prioritas |
|---|---|---|---|
| F-1 | **Autentikasi pemilih** | Login NIM+password, Argon2id, rate-limit | Must |
| F-2 | **Client-side key generation** | ECDSA keypair di browser, private key terenkripsi | Must |
| F-3 | **Secure ballot casting** | Hybrid encrypt (AES+RSA) + HMAC + ECDSA sign di klien | Must |
| F-4 | **Anonymous ballot box** | Penyimpanan surat suara tanpa identitas pemilih | Must |
| F-5 | **Eligibility / anti double-vote** | Penanda `has_voted` atomik + anti-replay nonce | Must |
| F-6 | **Verified tallying** | Verify signature+HMAC sebelum dekripsi & hitung | Must |
| F-7 | **Tamper-evident audit log** | Rantai HMAC-SHA256 | Should |
| F-8 | **Vote receipt** | Hash surat suara untuk verifikasi individual | Should |
| F-9 | **Admin election management** | CRUD pemilu, kandidat, pemilih, buka/tutup | Must |
| F-10 | **Results dashboard** | Hasil + daftar suara invalid + ekspor | Should |
| F-11 | **Landing page PACE** | Halaman publik informatif | Could |

---

## 6. User Flow

### 6.1 Flow Pemilih (alur utama)

```
[Registrasi/Aktivasi]
  └─> Login (NIM + password)
        └─> Browser bangkitkan ECDSA keypair
              ├─ public key  → kirim ke server
              └─ private key → simpan terenkripsi (password) di klien
  └─> Lihat daftar kandidat
        └─> Pilih 1 kandidat → konfirmasi
              └─> [Di browser] enkripsi + tanda tangani surat suara
                    └─> Kirim envelope ke server (HTTPS)
                          ├─ Server verifikasi signature
                          ├─ Server cek nonce (anti-replay)
                          ├─ Server cek & set has_voted (anti double-vote)
                          ├─ Simpan ke ballot box (anonim)
                          └─ Catat eligibility log + audit log
  └─> Terima RECEIPT (hash surat suara)
  └─> Selesai (tidak bisa memilih lagi)
```

### 6.2 Flow Admin / KPU

```
[Login admin]
  └─> Buat pemilu → bangkitkan RSA keypair
        ├─ public  → server (untuk enkripsi suara)
        └─ private → simpan KPU (offline; JANGAN di server saat voting)
  └─> Tambah kandidat
  └─> Validasi & aktivasi daftar pemilih
  └─> BUKA pemilu  ──(pemilih memberikan suara)──>  TUTUP pemilu
  └─> Jalankan penghitungan terverifikasi:
        untuk tiap surat suara:
          1. verify ECDSA signature
          2. RSA-decrypt wrapped key → K_enc, K_mac
          3. verify HMAC (gagal → tandai invalid, jangan dihitung)
          4. AES-decrypt → pilihan → hitung
  └─> Publikasi hasil (ditandatangani KPU) + ekspor audit log
```

### 6.3 Flow Penyerang (untuk pengujian BAB 4)

```
Coba: baca DB → ciphertext (gagal: tak ada kunci RSA privat)
Coba: ubah ciphertext di DB → tally menolak (HMAC gagal)
Coba: kirim suara atas nama orang lain → ditolak (signature gagal)
Coba: replay surat suara → ditolak (nonce sudah dipakai)
Coba: voting ganda → ditolak (has_voted)
Coba: korelasi pemilih↔pilihan → kotak suara tak punya voter_id
```

---

## 7. System Architecture

### 7.1 Diagram tingkat tinggi

```
┌────────────────────────────┐        ┌─────────────────────────────┐
│  CLIENT (React + Web Crypto)│ HTTPS  │  SERVER (Node.js + Express) │
│                            │ ─────> │                             │
│  • Login UI                │        │  • Auth (Argon2id, JWT)     │
│  • Key generation (ECDSA)  │        │  • Verify signature/nonce   │
│  • Ballot encrypt+sign     │        │  • Anti double-vote         │
│  • Receipt                 │ <───── │  • Persist (NO decrypt)     │
└────────────────────────────┘        └──────────────┬──────────────┘
                                                     │
                                       ┌──────────────▼──────────────┐
                                       │  DATABASE (SQLite)          │
                                       │  voters | elections |       │
                                       │  candidates | ballots(box)  │
                                       │  eligibility_log | audit_log│
                                       └──────────────┬──────────────┘
                                                     │ saat DITUTUP
                                       ┌──────────────▼──────────────┐
                                       │  KPU TALLYING (RSA private) │
                                       │  verify→unwrap→verify→decrypt│
                                       └─────────────────────────────┘
```

### 7.2 Prinsip arsitektur kunci
- **Server tidak pernah memegang kunci yang bisa membuka suara.** Kunci privat RSA pemilu dipegang KPU di luar server selama masa voting.
- **Enkripsi & tanda tangan terjadi di klien (end-to-end).** Server hanya menerima *envelope* yang sudah terenkripsi & tertanda tangan.
- **Pemisahan data:** tabel `ballots` (isi suara, anonim) tidak punya kolom apa pun yang menunjuk `voters`. Partisipasi dicatat terpisah di `eligibility_log`.

### 7.3 Struktur folder (rencana)

```
pace/
├── crypto-engine/        # modul kripto murni (dipakai klien & server) — BAB 3
│   ├── aes.js
│   ├── hmac.js
│   ├── rsa.js
│   ├── ecdsa.js
│   ├── audit-chain.js
│   └── __tests__/
├── server/               # Express API + SQLite
│   ├── routes/
│   ├── db/
│   └── index.js
├── client/               # React (Vite) — app pemilih & admin
│   ├── src/voter/
│   ├── src/admin/
│   └── src/crypto/       # wrapper Web Crypto API
└── landing/              # landing page PACE
```

---

## 8. Cryptographic Design

> Inti penilaian. Empat primitif, masing-masing dengan alasan keberadaan yang jelas.

### 8.1 Alur hibrida (envelope surat suara)

Saat pemilih memilih, browser melakukan:

```
1. Bangkitkan K_enc, K_mac acak (kunci sesi AES & MAC)
2. ciphertext = AES-256-CBC(K_enc, IV, pilihanKandidat)        ← AES
3. tag        = HMAC-SHA256(K_mac, IV ‖ ciphertext)            ← HMAC (Encrypt-then-MAC)
4. wrappedKey = RSA-OAEP(KPU_public, K_enc ‖ K_mac)            ← RSA (hybrid)
5. signature  = ECDSA(voter_private, IV‖ciphertext‖tag‖nonce‖ts) ← Digital Signature

Envelope = { wrappedKey, IV, ciphertext, tag, signature,
             signerPubKeyId, nonce, timestamp }
```

### 8.2 Confidentiality — AES *(BAB 2.1)*
- **AES-256-CBC**, IV acak 16-byte per surat suara.
- **Kenapa CBC + HMAC, bukan GCM?** Agar komponen HMAC berdiri sendiri & bisa didemonstrasikan eksplisit (GCM sudah punya MAC internal → membuat komponen HMAC mubazir). Migrasi ke GCM = saran di BAB 7.
- **Key separation:** `K_enc` ≠ `K_mac`, keduanya acak per suara, dibungkus bersama via RSA.

### 8.3 Integrity — HMAC-SHA256 *(BAB 2.2)*
- **Encrypt-then-MAC:** `tag = HMAC(K_mac, IV ‖ ciphertext)`.
- Verifikasi **waktu-konstan** (`crypto.timingSafeEqual`) untuk cegah timing attack.
- `K_mac` tak pernah polos — ikut dibungkus RSA, hanya terbuka saat tally.
- **Audit log berantai:** `mac_n = HMAC(K_audit, data_n ‖ mac_{n-1})` → ubah satu entri merusak seluruh rantai.

### 8.4 Authentication & Non-repudiation — ECDSA *(BAB 2.3)*
- **ECDSA P-256 (SHA-256)** — ringan untuk operasi sisi-klien.
- Menandatangani seluruh isi envelope.
- Verifikasi dengan public key pemilih (disimpan saat registrasi).
- Karena private key hanya di klien → pemilih tak bisa menyangkal suaranya.

### 8.5 Pemetaan ringkas
| Algoritma | Peran |
|---|---|
| RSA-OAEP | Membungkus kunci AES (hybrid) — server tak bisa dekripsi |
| AES-256-CBC | Merahasiakan isi suara |
| HMAC-SHA256 | Menyegel integritas suara + audit log |
| ECDSA P-256 | Autentikasi & non-repudiation pemilih |

---

## 9. Database Schema

```sql
-- Pemilih
voters (
  id            INTEGER PRIMARY KEY,
  nim           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,        -- Argon2id
  public_key_jwk TEXT,                -- ECDSA public key pemilih
  has_voted     INTEGER DEFAULT 0,    -- anti double-vote
  is_active     INTEGER DEFAULT 0,    -- divalidasi admin
  created_at    TEXT
)

-- Pemilu
elections (
  id             INTEGER PRIMARY KEY,
  title          TEXT NOT NULL,
  status         TEXT CHECK(status IN ('draft','open','closed')),
  rsa_public_key_pem TEXT,            -- kunci publik pemilu (enkripsi suara)
  start_at       TEXT,
  end_at         TEXT,
  created_at     TEXT
)

-- Kandidat
candidates (
  id            INTEGER PRIMARY KEY,
  election_id   INTEGER REFERENCES elections(id),
  ballot_number INTEGER,
  name          TEXT,
  vision        TEXT,
  photo_url     TEXT
)

-- KOTAK SUARA  (sengaja TANPA voter_id → menjaga ballot secrecy)
ballots (
  id               TEXT PRIMARY KEY,   -- UUID acak
  election_id      INTEGER REFERENCES elections(id),
  wrapped_key      TEXT,               -- RSA-OAEP(K_enc‖K_mac)
  iv               TEXT,
  ciphertext       TEXT,               -- AES-CBC
  hmac_tag         TEXT,               -- HMAC-SHA256
  signature        TEXT,               -- ECDSA
  signer_pub_key_id TEXT,
  nonce            TEXT,
  created_at       TEXT
)

-- Catatan partisipasi (TERPISAH dari isi suara)
eligibility_log (
  id           INTEGER PRIMARY KEY,
  voter_id     INTEGER REFERENCES voters(id),
  election_id  INTEGER REFERENCES elections(id),
  voted_at     TEXT,
  receipt_hash TEXT
)

-- Audit log anti-tampering (rantai HMAC)
audit_log (
  id         INTEGER PRIMARY KEY,
  seq        INTEGER,
  event_type TEXT,
  detail     TEXT,
  prev_mac   TEXT,
  mac        TEXT,                     -- HMAC(detail ‖ prev_mac)
  created_at TEXT
)

-- Anti-replay
used_nonces (
  nonce      TEXT PRIMARY KEY,
  created_at TEXT
)
```

> **Invarian keamanan:** tidak ada relasi `ballots → voters`. Inilah yang menjaga *ballot secrecy*. Pelanggaran invarian ini = bug keamanan kritis.

---

## 10. API Design

| Method | Endpoint | Auth | Fungsi |
|---|---|---|---|
| POST | `/api/auth/register` | — | Registrasi pemilih |
| POST | `/api/auth/login` | — | Login → JWT |
| POST | `/api/voter/publickey` | Voter | Simpan public key ECDSA |
| GET | `/api/elections/:id/candidates` | Voter | Daftar kandidat |
| GET | `/api/elections/:id/pubkey` | Voter | Ambil RSA public key pemilu |
| POST | `/api/elections/:id/vote` | Voter | Kirim envelope surat suara |
| GET | `/api/voter/receipt` | Voter | Ambil receipt |
| POST | `/api/admin/elections` | Admin | Buat pemilu + RSA keygen |
| POST | `/api/admin/candidates` | Admin | CRUD kandidat |
| PATCH | `/api/admin/elections/:id/status` | Admin | Buka/tutup |
| POST | `/api/admin/elections/:id/tally` | Admin | Penghitungan terverifikasi |
| GET | `/api/admin/audit-log` | Admin/Auditor | Audit log |

---

## 11. Tech Stack

| Lapisan | Teknologi | Alasan |
|---|---|---|
| **Frontend** | React + Vite | Cepat, modern, SPA |
| **Crypto (klien)** | Web Crypto API | Native, aman, key tak keluar browser |
| **Backend** | Node.js ≥ 20 + Express | Ringan, ekosistem matang |
| **Crypto (server)** | Modul `crypto` bawaan Node | Tanpa dependency, transparan, mudah dipertahankan |
| **Database** | SQLite (better-sqlite3) | Zero-config, mudah didemonstrasikan, blob terenkripsi terlihat jelas |
| **Auth** | JWT + Argon2id | Standar industri |
| **Hardening** | helmet, express-rate-limit | Defense-in-depth |
| **Landing page** | React / HTML+CSS | Bagian publik PACE |
| **Dev/Deploy** | npm scripts, `.env`, HTTPS self-signed (lokal) | Sesuai BAB 5.2 |

> Pilihan sadar: **tanpa library kripto pihak ketiga**. Memakai primitif bawaan membuat setiap baris bisa Anda jelaskan saat review — ini melindungi nilai Anda di BAB 3 & BAB 4.

---

## 12. Security & Threat Model

### 12.1 Aset data sensitif *(BAB 1.2)*

| Aset | Properti | Mekanisme |
|---|---|---|
| Isi surat suara | Confidentiality + Integrity | AES-CBC + HMAC, kunci dibungkus RSA |
| Identitas ↔ pilihan | Ballot secrecy | Pemisahan ballot box vs eligibility log |
| Password pemilih | Confidentiality | Argon2id (hash, bukan enkripsi) |
| Kunci privat pemilih | Confidentiality | Di klien, terenkripsi password (PBKDF2 → AES) |
| Kunci privat RSA KPU | Confidentiality | Dipegang KPU, offline saat voting |
| Audit log | Integrity | Rantai HMAC |
| Hasil penghitungan | Integrity + Non-repudiation | Ditandatangani KPU |

### 12.2 Penyerang & serangan *(BAB 1.3)*

| # | Serangan | Pertahanan |
|---|---|---|
| T-1 | Baca isi suara dari DB | Kunci AES dibungkus RSA — server tak punya RSA privat |
| T-2 | Ubah ciphertext di DB | HMAC gagal saat tally → ditolak & dilaporkan |
| T-3 | Palsukan suara orang lain | Wajib signature ECDSA, verifikasi public key |
| T-4 | Voting ganda | `has_voted` di-set atomik |
| T-5 | Replay attack | Nonce + timestamp dicatat & ditolak jika berulang |
| T-6 | MITM | HTTPS + payload terenkripsi & tertanda tangan end-to-end |
| T-7 | Korelasi pemilih↔pilihan | Kotak suara tanpa `voter_id`, hanya `ballot_id` acak |
| T-8 | Manipulasi audit log | Rantai HMAC — satu perubahan merusak rantai |
| T-9 | SQL injection kolom ciphertext | Prepared statements + validasi base64 |
| T-10 | Brute-force password | Argon2id + rate limiting + lockout |

> **Tegangan inti (wajib dikuasai):** kerahasiaan suara (T-7) vs non-repudiation (T-3) saling tarik. PACE memisahkan *eligibility log* (mencatat "X sudah memilih", tertanda tangan) dari *ballot box* anonim. Batasnya — pemetaan public-key→pemilih masih ada — diakui jujur di BAB 7, dengan blind signature/mixnet sebagai solusi lanjut.

---

## 13. Milestones & Roadmap

| Milestone | Isi | BAB | Prioritas |
|---|---|---|---|
| **M0** | PRD + arsitektur (dokumen ini) | 1, 2 | ✅ |
| **M1** | Core Crypto Engine + unit test | 2, 3 | Must |
| **M2** | Backend API + DB + audit log | 3, 5 | Must |
| **M3** | App Pemilih: login, keygen, vote, receipt | 6 | Must |
| **M4** | Panel KPU: kelola pemilu, validasi, tally | 6 | Must |
| **M5** | Landing page PACE | 6 | Should |
| **M6** | Hardening + persiapan peer-review | 4, 5, 7 | Should |

**Definisi MVP (lulus dengan nilai baik):** M1 + M2 + M3 + M4.

---

## 14. Risks & Open Questions

| Risiko | Mitigasi |
|---|---|
| Pemilih kehilangan kunci privat di browser | Backup terenkripsi + opsi unduh; dokumentasikan batas |
| Kunci privat RSA KPU bocor | Offline saat voting; usul threshold cryptography (BAB 7) |
| Insider mengganti public key pemilih saat registrasi | Validasi admin + audit log; akui batas kepercayaan |
| Scope membengkak (deadline UAS) | Patuhi definisi MVP §13 |

**Open questions untuk tim:**
1. Kunci privat pemilih: `localStorage` terenkripsi vs unduh file? *(Rekomendasi: keduanya.)*
2. Peran Auditor terpisah perlu? *(Rekomendasi: opsional bila waktu cukup.)*
3. RSA-2048 atau RSA-3072 untuk key-wrapping? *(Rekomendasi: 2048 cukup untuk demo, sebut 3072+ di BAB 7.)*

---

## 15. Appendix — Pemetaan ke Laporan

| BAB Laporan | Sumber di PRD |
|---|---|
| BAB 1.1 Deskripsi Aplikasi | §1 |
| BAB 1.2 Aset Data Sensitif | §12.1 |
| BAB 1.3 Model Ancaman | §12.2 |
| BAB 2.1 AES | §8.2 |
| BAB 2.2 HMAC | §8.3 |
| BAB 2.3 Digital Signature | §8.4 |
| BAB 3 Implementasi Kode | §8 + kode M1 |
| BAB 4 Pengujian & Serangan | §12.2 (jadi checklist) + hasil M6 |
| BAB 5 Perbaikan & Deployment | §11, §14 + hasil M6 |
| BAB 6 Dokumentasi Antarmuka | Screenshot M3–M5 |
| BAB 7 Kesimpulan & Saran | §2.2, §12 (tegangan & batas) |

---

*Dokumen hidup — perbarui versi bila keputusan desain berubah.*
