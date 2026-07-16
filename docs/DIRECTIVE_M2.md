# DIRECTIVE M2 — Backend API + Database + Audit Log

> Pola kerja sama seperti M1: tempel bagian **§Directive** ke Antigravity,
> review Implementation Plan terhadap dokumen ini SEBELUM Proceed, lalu
> verifikasi hasil pakai **§Checklist**. Jangan lanjut M3 sebelum checklist hijau.

---

## Keputusan desain yang DIKUNCI (jangan diubah agent)

1. **Enkripsi & tanda tangan terjadi di SISI KLIEN.** Server M2 hanya MENERIMA
   amplop yang sudah tersegel + tertanda tangan, lalu memverifikasi & menyimpan.
   **Server TIDAK PERNAH mendekripsi suara saat masa voting.**
2. **Kunci privat RSA KPU TIDAK disimpan di server.** Server menyimpan hanya
   kunci PUBLIK pemilu. Kunci privat di-generate saat pemilu dibuat, ditampilkan
   sekali untuk diunduh admin, lalu dibuang dari server. Saat tally, admin
   mengunggah kunci privat → dipakai **di memori saja** → tidak ditulis ke disk.
3. **Password di-hash dengan `crypto.scrypt` (BAWAAN Node).** Bukan argon2/bcrypt
   (agar tetap tanpa dependensi crypto pihak ketiga). Simpan salt + hash.
4. **Dedup suara WAJIB lewat `nonce`**, bukan signature (ECDSA malleable).

---

## Directive (tempel ke Antigravity)

```
Baca PRD_PACE_v2.md (§9 schema, §10 API) dan AGENTS.md (seluruh guardrail).
Pakai kembali modul crypto-engine/ yang sudah ada — JANGAN tulis ulang crypto.

Bangun backend di server/ memakai Express + better-sqlite3. Lingkup M2:

A. DATABASE (db/): buat skema SQLite sesuai PRD §9, PERSIS termasuk invarian:
   tabel `ballots` TIDAK BOLEH punya kolom voter_id atau relasi apa pun ke voters.
   Semua akses DB pakai prepared statement.

B. AUTH:
   - POST /api/auth/register  : simpan nim, name, password (hash via crypto.scrypt).
   - POST /api/auth/login     : verifikasi password (timing-safe), kembalikan JWT.
   - JWT secret dari .env. Argon2/bcrypt DILARANG; pakai scrypt bawaan.

B2. VOTER KEY:
   - POST /api/voter/publickey : simpan ECDSA public key pemilih (JWK/PEM).

C. ADMIN:
   - POST /api/admin/elections : buat pemilu; generate RSA keypair (rsa.js);
     SIMPAN HANYA public key di DB; kembalikan private key di response SEKALI
     untuk diunduh admin; JANGAN simpan/log private key di server.
   - CRUD /api/admin/candidates
   - PATCH /api/admin/elections/:id/status : open / closed
   - POST /api/admin/elections/:id/tally : terima RSA private key di body
     (pakai di memori saja, jangan tulis ke disk). Lihat alur TALLY di bawah.

D. VOTING (endpoint paling kritis):
   POST /api/elections/:id/vote  (butuh JWT)
   Body amplop (string hex/base64):
     { wrappedKey, iv, ciphertext, tag, nonce, timestamp,
       signature, signerPublicKeyId }
   Langkah server (URUTAN WAJIB):
     1. Authn JWT -> voterId.
     2. Pastikan election berstatus 'open'.
     3. Ambil ECDSA public key pemilih dari DB.
     4. Verifikasi signature:
        verifyBallot(pubKey,
          serializeEnvelope({electionId, wrappedKey, iv, ciphertext, tag,
                             nonce, timestamp}),
          signature)
        -> jika false, tolak 400. (WAJIB lewat serializeEnvelope dari envelope.js,
           DILARANG gabung string manual.)
     5. Cek nonce di used_nonces -> jika sudah ada, tolak (replay).
     6. DALAM SATU TRANSAKSI:
        - cek eligibility_log: jika voter sudah memilih di election ini, tolak.
          (Pakai UNIQUE constraint (voter_id, election_id) sebagai jaminan akhir.)
        - INSERT ballots (id=UUID acak, TANPA voter_id; simpan signer_pub_key
          agar tally bisa verifikasi).
        - INSERT eligibility_log (voter_id, election_id, voted_at, receipt_hash).
        - set voters.has_voted = 1.
        - INSERT used_nonces (nonce).
        - appendAuditLog('VOTE_CAST', ...) pakai audit-chain.js.
     7. Kembalikan receipt_hash (mis. SHA-256 dari serializeEnvelope+signature).

E. TALLY (alur per surat suara — DILARANG mengubah urutan):
   Untuk tiap baris di ballots (election terkait):
     1. verifyBallot(signer_pub_key, serializeEnvelope({...}), signature)
        -> gagal: tandai INVALID, jangan dihitung, catat ke laporan.
     2. keyMaterial = rsaUnwrapKey(KPU_privateKey, wrappedKey)
        -> K_enc = 32 byte pertama, K_mac = 32 byte berikutnya.
     3. hasil = openBallot({iv, ciphertext, tag}, K_enc, K_mac)  // envelope.js
        -> hasil.ok === false: tandai INVALID. (openBallot verifikasi HMAC
           SEBELUM dekripsi — JANGAN panggil aesDecrypt langsung.)
     4. candidateId = parse(hasil.plaintext) -> tambah hitungan.
   Kembalikan: rekap suara per kandidat + jumlah & daftar surat suara INVALID.

F. HARDENING: helmet, express-rate-limit (khusus /auth), validasi & batasi
   ukuran input, CORS yang ketat. Semua secret di .env (.env ada di .gitignore).

G. TEST integrasi (server/__tests__/ atau script): SIMULASIKAN klien memakai
   crypto-engine Node untuk membuat amplop yang sah, lalu uji:
   - happy path: vote sah -> tersimpan -> receipt keluar.
   - double-vote: vote kedua dari voter sama -> DITOLAK.
   - replay: kirim ulang nonce yang sama -> DITOLAK.
   - tamper: ubah 1 byte ciphertext di DB -> tally menandai INVALID.
   - forged signature: amplop dengan signature salah -> DITOLAK di /vote.
   - tally end-to-end: hitung benar untuk beberapa suara.

Kerjakan backend + DB + test. JANGAN kerjakan UI/React (itu M3).
Tunggu review saya sebelum lanjut.
```

---

## Checklist verifikasi manusia (sebelum lanjut M3)

**Invarian kerahasiaan**
- [ ] Tabel `ballots` TIDAK punya kolom `voter_id` (cek skema langsung).
- [ ] Tidak ada query yang menggabungkan `ballots` dengan `voters`/`eligibility_log`.

**Kunci**
- [ ] DB hanya menyimpan RSA **public** key; private key TIDAK ada di DB, log, atau file.
- [ ] Saat tally, private key hanya di memori (tidak ada `fs.writeFile` untuk kunci).
- [ ] JWT secret & semua rahasia dari `.env`; `.env` ada di `.gitignore`.

**Crypto composition**
- [ ] Verifikasi signature di `/vote` memakai `serializeEnvelope` (bukan gabung manual).
- [ ] Tally membuka suara HANYA lewat `openBallot()` (HMAC dulu, baru decrypt).
- [ ] Password di-hash dengan `crypto.scrypt`; verifikasi password timing-safe.

**Anti-abuse**
- [ ] Double-vote dicegah lewat transaksi + UNIQUE(voter_id, election_id).
- [ ] Replay dicegah lewat `used_nonces` (BUKAN signature).
- [ ] Semua query DB parameterized (uji satu input berisi `' OR 1=1 --`).

**Bukti (untuk laporan)**
- [ ] Test integrasi G di atas semuanya hijau (`node --test`).
- [ ] Test "tamper di DB -> tally INVALID" benar-benar membuktikan deteksinya.

---

## Catatan keterbatasan (untuk BAB 7 — sebut jujur)

Karena `signer_pub_key` disimpan bersama surat suara agar tally bisa
memverifikasi tanda tangan, surat suara bersifat **pseudonim**: siapa pun yang
memegang peta (public key ↔ pemilih) secara teori bisa mengaitkannya. Server
tidak menyimpan peta itu di tabel `ballots`, tapi peta itu ada di `voters`.
Anonimitas penuh menuntut **blind signature / mixnet / homomorphic tallying** —
sebutkan sebagai pengembangan lanjutan, bukan klaim yang sudah dipenuhi.
