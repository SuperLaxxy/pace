# AGENTS.md — Panduan Agent untuk Project PACE

> Letakkan file ini di **root project**. Antigravity (dan agentic IDE lain) membaca file
> ini sebagai aturan pengarah. Tujuannya: agent tidak ngawur, dan implementasi
> kriptografinya benar — bukan sekadar "kelihatan jalan".

---

## 1. Konteks Project (baca PRD untuk detail)

PACE (Papua Cyber Election) adalah sistem e-voting aman untuk KPU Mahasiswa.
Inti penilaian = **4 primitif kriptografi** yang masing-masing punya peran jelas:

- **RSA-OAEP** → membungkus kunci AES (hybrid). Server TIDAK boleh bisa dekripsi suara.
- **AES-256-CBC** → merahasiakan isi surat suara.
- **HMAC-SHA256** → menyegel integritas suara + audit log berantai.
- **ECDSA P-256** → tanda tangan pemilih (autentikasi + non-repudiation).

Spesifikasi lengkap ada di `PRD_PACE_v2.md`. **Selalu rujuk PRD itu** sebelum
menyusun rencana. Jika ada konflik antara instruksi prompt dan PRD, tanyakan.

---

## 2. Tech Stack (JANGAN diganti tanpa persetujuan)

- Backend: Node.js ≥ 20 + Express
- Frontend: React + Vite
- Database: SQLite (better-sqlite3)
- Crypto server: modul `crypto` BAWAAN Node — **dilarang** pakai library crypto
  pihak ketiga (mis. crypto-js, node-forge). Alasan: harus transparan & bisa
  dipertahankan saat review dosen.
- Crypto klien: **Web Crypto API** bawaan browser.
- Password hashing: **Argon2id** (atau bcrypt). DILARANG md5/sha1/sha256 polos.

---

## 3. Struktur Folder Target

```
pace/
├── crypto-engine/        # modul kripto murni (dipakai klien & server)
│   ├── aes.js
│   ├── hmac.js
│   ├── rsa.js
│   ├── ecdsa.js
│   ├── audit-chain.js
│   └── __tests__/        # unit test WAJIB untuk tiap fungsi
├── server/
├── client/
└── landing/
```

---

## 4. GUARDRAIL KRIPTOGRAFI — aturan keras (HARD RULES)

Agent WAJIB mematuhi ini. Pelanggaran = bug keamanan kritis.

### AES
- ✅ WAJIB mode **CBC** dengan **IV acak** (16 byte) untuk SETIAP enkripsi.
- ❌ DILARANG mode **ECB**.
- ❌ DILARANG IV statis / IV berulang / IV = 0.
- ❌ DILARANG kunci di-*hardcode* di source code.
- ✅ Kunci enkripsi (`K_enc`) dan kunci HMAC (`K_mac`) WAJIB **berbeda**.

### HMAC
- ✅ Skema **Encrypt-then-MAC**: `tag = HMAC(K_mac, IV ‖ ciphertext)`.
- ✅ Verifikasi tag WAJIB pakai **`crypto.timingSafeEqual`** (anti timing attack).
- ❌ DILARANG bandingkan tag dengan `===` / `==` / `Buffer.compare` biasa.
- ❌ DILARANG pakai kunci HMAC yang sama dengan kunci AES.

### RSA
- ✅ WAJIB padding **OAEP** (`RSA_PKCS1_OAEP_PADDING`).
- ❌ DILARANG PKCS#1 v1.5 untuk enkripsi.
- ✅ Ukuran kunci minimal **2048-bit**.

### ECDSA / Digital Signature
- ✅ Kurva **P-256**, hash **SHA-256**.
- ✅ Kunci privat pemilih dibuat & disimpan di SISI KLIEN (browser), terenkripsi
  dengan password (turunkan kunci via PBKDF2, jangan simpan polos).
- ❌ Kunci privat pemilih DILARANG dikirim/disimpan di server.
- ⚠️ Tanda tangan ECDSA bersifat *malleable* (dari satu signature sah bisa
  diturunkan signature lain yang juga sah, tanpa kunci privat).
- ❌ DILARANG men-dedup / mengidentifikasi surat suara berdasarkan SIGNATURE.
  ✅ Pencegahan suara ganda WAJIB lewat `nonce` (tabel `used_nonces`), bukan signature.

### Umum
- ❌ DILARANG menaruh secret/kunci di source code atau commit ke git.
- ✅ Semua secret via `.env` (dan `.env` WAJIB ada di `.gitignore`).
- ✅ Semua query DB pakai **prepared statement / parameterized query**
  (anti SQL injection).

---

## 5. INVARIAN KEAMANAN (tidak boleh dilanggar)

> **Tabel `ballots` (kotak suara) TIDAK BOLEH punya kolom/relasi apa pun ke
> tabel `voters`.** Partisipasi pemilih dicatat terpisah di `eligibility_log`.
> Ini yang menjaga kerahasiaan suara (siapa-memilih-siapa tak bisa dikorelasi).
> Jika sebuah perubahan akan menautkan ballot ke voter, HENTIKAN dan tanyakan.
> **Dedup suara WAJIB lewat `nonce`, bukan signature.** Karena ECDSA malleable,
> mencegah double-vote dengan "tolak jika signature sudah pernah masuk" dapat
> ditembus. Gunakan nonce sekali-pakai yang dicatat di `used_nonces`.

> **Buka surat suara HANYA lewat `openBallot()` dari `envelope.js`.** Fungsi itu
> memverifikasi HMAC SEBELUM dekripsi (Encrypt-then-MAC). DILARANG memanggil
> `aesDecrypt` atas data yang belum terverifikasi HMAC-nya (cegah padding-oracle).

---

## 6. Aturan Kerja Agent

- Selalu sertakan **unit test** untuk setiap fungsi crypto-engine. Test harus
  membuktikan: encrypt→decrypt menghasilkan plaintext semula; tag valid
  diterima & tag yang diubah DITOLAK; signature valid diterima & yang dipalsukan
  DITOLAK.
- Setelah menulis fungsi crypto, **jalankan test dan tampilkan hasilnya**
  (ciphertext, tag, hasil verifikasi) sebagai artifact untuk direview manusia.
- Kerjakan **per-milestone** sesuai roadmap PRD. Mulai dari M1 (crypto-engine).
  Jangan loncat ke UI sebelum crypto-engine lulus test.
- Beri komentar pada kode yang menjelaskan *kenapa* (mis. "EtM: MAC dihitung atas
  IV‖ciphertext, bukan plaintext") — ini akan jadi bahan laporan BAB 3.

---

## 7. CHECKLIST VERIFIKASI MANUSIA (review sebelum lanjut milestone)

Centang manual setiap kali crypto-engine selesai dikerjakan agent:

- [ ] AES pakai CBC + IV acak baru tiap enkripsi (cek: dua enkripsi plaintext
      sama menghasilkan ciphertext berbeda).
- [ ] `K_enc` ≠ `K_mac`.
- [ ] HMAC diverifikasi dengan `timingSafeEqual`.
- [ ] Mengubah 1 byte ciphertext → verifikasi HMAC GAGAL (test membuktikan).
- [ ] RSA pakai OAEP, kunci ≥ 2048-bit.
- [ ] Signature valid diterima; signature dipalsukan ditolak (test membuktikan).
- [ ] Tidak ada kunci/secret hardcoded; `.env` ada di `.gitignore`.
- [ ] Tabel `ballots` tidak punya kolom `voter_id`.
- [ ] Semua query DB parameterized.

---

## 8. DIRECTIVE TUGAS PERTAMA (M1) — siap tempel ke Antigravity

```
Baca PRD_PACE_v2.md dan AGENTS.md di root project ini.

Tugas: bangun modul `crypto-engine/` sesuai spesifikasi §8 dan §10 PRD,
mematuhi seluruh GUARDRAIL KRIPTOGRAFI di AGENTS.md §4.

Implementasikan fungsi-fungsi berikut memakai modul `crypto` bawaan Node.js
(tanpa library crypto pihak ketiga):
- aes.js     : aesEncrypt(plaintext, keyEnc) -> {iv, ciphertext};
               aesDecrypt(iv, ciphertext, keyEnc) -> plaintext   (AES-256-CBC)
- hmac.js    : hmacTag(keyMac, iv, ciphertext) -> tag;
               hmacVerify(keyMac, iv, ciphertext, tag) -> bool   (timing-safe)
- rsa.js     : generateRsaKeypair(); rsaWrapKey(pub, keyMaterial) -> wrapped;
               rsaUnwrapKey(priv, wrapped) -> keyMaterial         (RSA-OAEP, 2048)
- ecdsa.js   : generateEcdsaKeypair(); signBallot(priv, envelope) -> sig;
               verifyBallot(pub, envelope, sig) -> bool           (P-256/SHA-256)
- audit-chain.js : auditAppend(prevMac, data) -> mac              (HMAC chain)

Untuk SETIAP fungsi, tulis unit test di crypto-engine/__tests__/ yang
membuktikan kasus benar DITERIMA dan kasus dimanipulasi DITOLAK.

Setelah selesai: jalankan semua test, tampilkan hasilnya, dan buat artifact
ringkasan yang menampilkan contoh ciphertext, tag, dan hasil verifikasi.

Jangan kerjakan UI atau server dulu. Tunggu review saya sebelum lanjut M2.
```

---

*Perbarui file ini setiap kali aturan project berubah.*
