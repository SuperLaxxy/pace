# DIRECTIVE M3 — Aplikasi Pemilih (React + Web Crypto API)

> Pola sama: tempel **§Directive** ke Antigravity, review Implementation Plan
> terhadap dokumen ini SEBELUM Proceed, verifikasi pakai **§Checklist**.
>
> ⚠️ M3 BERBEDA dari M1/M2: crypto harus jalan di BROWSER (Web Crypto API),
> bukan node:crypto. Amplop yang dibuat browser WAJIB bisa diverifikasi &
> didekripsi oleh backend M2. Bagian tersulit & paling rawan ada di
> **§Peta Interop**. Baca itu lebih dulu.

---

## Keputusan desain yang DIKUNCI

1. **Enkripsi & tanda tangan terjadi di browser pemilih.** Server tak pernah
   melihat suara polos maupun kunci privat pemilih.
2. **Kunci privat ECDSA pemilih dibuat di browser, TIDAK PERNAH dikirim ke
   server.** Disimpan terenkripsi (kunci diturunkan dari password via PBKDF2)
   di `localStorage`, PLUS opsi unduh sebagai file cadangan.
3. **Kunci publik pemilih dikirim ke server sebagai SPKI PEM** (cocok dengan
   `verifyBallot` backend yang memakai PEM).
4. **Semua crypto via Web Crypto API bawaan browser.** Tanpa library crypto
   pihak ketiga.
5. **Yang dienkripsi hanyalah `candidateId`** (string angka, tanpa spasi/newline).

---

## ⚠️ PERUBAHAN WAJIB pada crypto-engine (interop tanda tangan)

Ini titik interop paling kritis. Web Crypto API menghasilkan tanda tangan ECDSA
dalam format **IEEE-P1363 (raw r‖s, 64 byte)**, sedangkan Node `crypto` secara
default memakai/mengharapkan format **DER (ASN.1)**. Tanda tangan dari browser
akan SELALU GAGAL diverifikasi backend kalau format tidak disamakan.

Solusi (paling robust, hindari konversi ASN.1 manual): samakan SELURUH sistem ke
IEEE-P1363 dengan menyetel `dsaEncoding` di `crypto-engine/ecdsa.js`.

```js
// di signBallot:
const signature = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' }, 'base64');

// di verifyBallot:
return verify.verify({ key: publicKeyPem, dsaEncoding: 'ieee-p1363' }, signatureBase64, 'base64');
```

Karena sign DAN verify diubah bersamaan, seluruh test M1 & M2 harus tetap hijau
(round-trip konsisten). WAJIB jalankan `node --test` setelah perubahan ini.

---

## §Peta Interop — Node (crypto-engine) ↔ Web Crypto (browser)

| Operasi | Node (server) | Browser (SubtleCrypto) | Jebakan utama |
|---|---|---|---|
| **AES** | `aes-256-cbc`, IV 16B acak, output hex | `crypto.subtle.encrypt({name:'AES-CBC', iv}, key, data)`; import K_enc via `importKey('raw', 32B, 'AES-CBC')` | Output ArrayBuffer → **hex**. IV 16B dari `crypto.getRandomValues`. |
| **HMAC** | HMAC-SHA256 atas `Buffer(ivHex)‖Buffer(ctHex)` (RAW BYTES), hex | `importKey('raw', K_mac, {name:'HMAC',hash:'SHA-256'})`; `sign` atas `concat(ivBytes, ctBytes)` | Hash atas **byte mentah hasil hex-decode**, BUKAN string hex. Harus persis = sisi Node. |
| **RSA wrap** | `publicEncrypt({padding:OAEP, oaepHash:'sha256'})`, base64 | `importKey('spki', kpuPub, {name:'RSA-OAEP', hash:'SHA-256'})`; `encrypt` | **hash WAJIB SHA-256 di KEDUA sisi.** Beda hash → unwrap gagal diam-diam. |
| **ECDSA** | P-256/SHA-256, `dsaEncoding:'ieee-p1363'` (setelah patch) | `sign({name:'ECDSA', hash:'SHA-256'}, privKey, data)` → raw r‖s | Format harus **ieee-p1363 di dua sisi** (lihat patch di atas). |
| **Public key** | PEM SPKI (dipakai verifyBallot) | `exportKey('spki', pubKey)` → DER → bungkus jadi PEM | Kirim **SPKI PEM** ke `/voter/publickey`. |
| **Encoding** | iv/ciphertext/tag = **hex**; wrappedKey/signature = **base64** | helper ArrayBuffer↔hex & ArrayBuffer↔base64 | Samakan PERSIS dengan server. |
| **Canonical** | `serializeEnvelope` = JSON urutan tetap [electionId, wrappedKey, iv, ciphertext, tag, nonce, timestamp], tiap field `String()` | replika IDENTIK di klien | Beda 1 byte (urutan/spasi/tipe) → verifikasi gagal. |
| **electionId** | string dari URL param | string yang sama | Pakai nilai string yang sama saat menandatangani. |

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE_M3.md, PRD_PACE_v2.md, dan AGENTS.md.

TUGAS 0 (lakukan dulu): Patch crypto-engine/ecdsa.js agar signBallot & verifyBallot
memakai dsaEncoding:'ieee-p1363' (lihat DIRECTIVE_M3 §perubahan wajib). Jalankan
`node --test` dan pastikan SEMUA test lama tetap hijau.

TUGAS 1 — Modul crypto klien (client/src/crypto/):
Bangun modul Web Crypto API yang menjadi padanan crypto-engine, mengikuti
§Peta Interop di DIRECTIVE_M3 dengan TEPAT:
  - aesEncrypt (AES-256-CBC, IV 16B acak) -> {iv(hex), ciphertext(hex)}
  - hmacTag (HMAC-SHA256 atas byte iv‖ciphertext) -> tag(hex)
  - rsaWrapKey (RSA-OAEP hash SHA-256, import SPKI PEM kunci publik KPU) -> base64
  - ECDSA: generateKeypair (P-256), sign (output base64 IEEE-P1363), exportPublicKeySpkiPem
  - serializeEnvelope: REPLIKA IDENTIK dari crypto-engine/envelope.js
    (JSON, urutan field sama, String() tiap field)
  - helper: hex<->ArrayBuffer, base64<->ArrayBuffer
  - keystore: simpan/buka kunci privat terenkripsi password (PBKDF2 -> AES-GCM
    wrap PKCS8), di localStorage + fungsi export/import file cadangan.

TUGAS 2 — Test interop (PALING PENTING, jalankan di Node):
Manfaatkan Web Crypto API yang juga tersedia di Node (globalThis.crypto.subtle).
Buat test yang: (a) membuat amplop LENGKAP memakai modul crypto KLIEN (Web Crypto),
lalu (b) memverifikasinya memakai crypto-engine SERVER (node:crypto):
  - verifyBallot(pub, serializeEnvelope(...), signature) === true
  - rsaUnwrapKey(kpuPriv, wrappedKey) -> openBallot(...) === { ok:true, plaintext:candidateId }
Ini membuktikan interop browser<->server tanpa browser sungguhan. WAJIB hijau.

TUGAS 3 — Aplikasi React pemilih (client/src/voter/):
  - Halaman Register & Login (panggil API M2; simpan JWT).
  - Saat aktivasi/first login: generate ECDSA keypair di browser; kirim SPKI PEM
    ke POST /voter/publickey; simpan privat terenkripsi + tawarkan unduh cadangan.
  - Halaman daftar kandidat (GET /elections/:id/candidates).
  - Alur memilih: ambil RSA public key pemilu (GET /elections/:id/pubkey) ->
    bangun amplop (K_enc/K_mac acak -> AES -> HMAC -> RSA-wrap -> sign) ->
    POST /elections/:id/vote -> tampilkan receiptHash.
  - Halaman receipt.
  - UX: alur memilih <= 3 langkah, Bahasa Indonesia, responsif mobile.

TUGAS 4 — Tampilan: ikuti skill frontend-design untuk styling yang rapi
(tema PACE). Jangan kerjakan landing page (itu M5).

Jangan menyentuh skema DB atau endpoint M2 kecuali patch ecdsa.js di Tugas 0.
Tunggu review saya sebelum lanjut.
```

---

## §Checklist verifikasi manusia (sebelum tutup M3)

**Interop (paling penting)**
- [ ] `node --test` tetap hijau SETELAH patch `ecdsa.js` (sign+verify ieee-p1363).
- [ ] Test interop Tugas 2 hijau: amplop dari Web Crypto lolos `verifyBallot` +
      `openBallot` di crypto-engine.
- [ ] Uji end-to-end nyata: memilih dari browser → backend M2 menerima (201) →
      tally menghitung suara itu sebagai VALID.

**Keamanan kunci privat**
- [ ] Buka DevTools → Network saat memilih: payload `/vote` TIDAK mengandung
      kunci privat pemilih (hanya amplop + signature + public key id).
- [ ] Kunci privat di `localStorage` tersimpan TERENKRIPSI (bukan PEM polos).
- [ ] Password salah → gagal membuka kunci dengan tenang (tidak crash, tidak bocor).

**Korektnes**
- [ ] Public key yang tersimpan di server adalah SPKI PEM dan `verifyBallot` jalan.
- [ ] Yang dienkripsi hanya `candidateId` (cek: tally `parseInt` berhasil).
- [ ] RSA-OAEP memakai hash SHA-256 di sisi browser (samakan dengan server).

**Bukti (laporan)**
- [ ] Screenshot alur memilih (BAB 6) + contoh amplop di Network tab.

---

## §Catatan keterbatasan (untuk BAB 7)

- Kunci privat di `localStorage` rawan terhadap **XSS**: skrip jahat yang berhasil
  dissuntikkan ke halaman bisa membaca penyimpanan. Keamanannya juga bergantung
  pada kekuatan password pemilih. Mitigasi lanjutan (CSP ketat, WebAuthn/hardware
  key) disebut sebagai pengembangan.
- **Tidak ada pemulihan kunci**: jika pemilih kehilangan kunci privat & file
  cadangannya, ia tidak bisa memilih. Ini konsekuensi desain yang benar, bukan bug.
