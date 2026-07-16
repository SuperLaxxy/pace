# DIRECTIVE FIX — Kunci Publik Pemilih Tidak Terdaftar (Vote ditolak)

> Gejala: saat memilih, server menolak "Voter public key not registered".
> Penyebab: kunci publik pemilih tidak tersimpan di kolom `voters.public_key_jwk`.
> Ini perbaikan ALUR setup-key di frontend (+ verifikasi data). JANGAN sentuh
> logika crypto/backend vote. node --test harus tetap hijau.

---

## 1. Konteks & diagnosis

- Backend `voting.js` BENAR: endpoint `/vote` menolak bila `public_key_jwk` null
  (ini perilaku keamanan yang BENAR — jangan diubah). Endpoint
  `POST /api/voter/publickey` untuk menyimpan kunci publik juga sudah ada.
- Penolakan terjadi karena kunci publik pemilih TIDAK pernah sampai ke server.
- Dugaan: komponen setup-key (mis. `client/src/voter/SetupKey.jsx`) men-generate
  pasangan kunci ECDSA di browser tetapi TIDAK memanggil `POST /api/voter/publickey`
  dengan benar (atau gagal diam-diam), sehingga kolom tetap kosong.
- Akun lama (dibuat sebelum perbaikan) hampir pasti tanpa kunci. Skrip
  `server/check-keys.js` mengonfirmasi pemilih mana yang `punya_kunci_publik = 0`.

---

## 2. Yang harus diperiksa & diperbaiki (frontend)

Periksa komponen yang menangani generate + simpan kunci (kemungkinan
`voter/SetupKey.jsx`; jika namanya beda, temukan komponen route `/setup-key`):

1. Setelah generate pasangan kunci ECDSA P-256 di browser, komponen WAJIB
   mengirim kunci PUBLIK ke server:
   - `POST /api/voter/publickey` dengan body `{ publicKeyPem: <kunci publik> }`
     dan header `Authorization: Bearer <token>` (token dari localStorage,
     nama kunci yang SAMA dengan yang dipakai Login/Dashboard/Vote — 'token').
2. Tangani respons dengan jujur:
   - Sukses → barulah simpan kunci PRIVAT terenkripsi di localStorage dan
     navigasi ke /dashboard.
   - Gagal → tampilkan error yang jelas, JANGAN lanjut seolah berhasil. (Kalau
     kunci privat tersimpan tapi publik gagal terkirim, pemilih jadi tidak bisa
     memilih — persis bug sekarang.)
3. Pastikan FORMAT kunci publik yang dikirim COCOK dengan yang diharapkan
   `verifyBallot` saat verifikasi tanda tangan (kolom `public_key_jwk` dipakai
   apa adanya untuk verifikasi). Jangan ubah format hanya di satu sisi — generate,
   simpan, dan verifikasi harus konsisten. JANGAN ubah crypto-engine; sesuaikan
   sisi pengiriman agar cocok dengan yang sudah diverifikasi backend.
4. Konsistensi nama kunci localStorage untuk token tetap satu nama ('token')
   di semua file pemilih (Login simpan, SetupKey/Dashboard/Vote baca).

**Catatan penting:** `POST /api/voter/publickey` menolak bila kunci sudah ada
atau pemilih sudah memilih. Untuk pemilih yang BELUM punya kunci & belum memilih,
endpoint ini harus berhasil. Jangan ubah penjaga keamanan ini.

---

## 3. Untuk menguji SEKARANG (data lama tidak perlu diperbaiki manual)

Pakai akun pemilih BARU agar melewati alur lengkap dengan kode yang sudah benar:
1. Registrasi pemilih baru di `/register`.
2. Aktifkan pemilih itu dari panel admin (tombol "Aktifkan").
3. Login → halaman setup-key muncul → kunci publik terkirim ke server (cek dengan
   `node check-keys.js`: pemilih baru harus `punya_kunci_publik = 1`).
4. Pilih kandidat → masukkan password kunci → suara terkirim (201) → resi muncul.
5. Cek panel admin: "Suara Masuk" bertambah & Live Audit Log terisi entri VOTE_CAST.

---

## 4. Aturan keras

- JANGAN ubah: `crypto-engine/` (ecdsa, serialize, seal, envelope, audit-chain),
  logika `/vote`, transaksi atomik, penanganan anti-replay/anti-double-vote,
  invarian `ballots` tanpa `voter_id`, skema DB.
- Ini perbaikan alur kirim-kunci di frontend + konsistensi token, BUKAN kriptografi.
- `node --test` harus tetap hijau (target yang biasa — pastikan jumlah test TIDAK
  menyusut; laporkan angka ringkasannya).

---

## §Directive (tempel ke Antigravity)

```
Bug: memilih ditolak "Voter public key not registered". Penyebab: kunci publik
pemilih tidak tersimpan di server (kolom voters.public_key_jwk kosong) karena
alur setup-key tidak mengirimnya dengan benar.

1. Periksa komponen route /setup-key (mis. voter/SetupKey.jsx). Pastikan setelah
   generate pasangan kunci ECDSA P-256, komponen MEMANGGIL POST /api/voter/publickey
   dengan body { publicKeyPem } dan header Authorization: Bearer <token> (token dari
   localStorage key 'token', konsisten dengan Login/Dashboard/Vote).
2. Tangani respons: sukses -> simpan kunci privat terenkripsi & ke /dashboard;
   gagal -> tampilkan error jelas, JANGAN lanjut seolah berhasil.
3. Pastikan format kunci publik yang dikirim konsisten dengan yang diverifikasi
   backend (verifyBallot pakai public_key_jwk apa adanya). Sesuaikan sisi frontend
   agar cocok; JANGAN ubah crypto-engine.
4. Jangan ubah penjaga keamanan di /vote dan /voter/publickey.

DILARANG mengubah crypto-engine/, logika /vote, transaksi, skema DB. node --test
harus tetap hijau (laporkan jumlah test, jangan sampai menyusut).

Verifikasi dengan AKUN PEMILIH BARU: registrasi -> aktifkan di admin -> login ->
setup-key (kunci publik terkirim) -> pilih -> password -> suara terkirim 201 ->
resi muncul. Konfirmasi di server: node check-keys.js menunjukkan pemilih baru
punya_kunci_publik = 1, dan "Suara Masuk" di admin bertambah.
```

---

## §Checklist verifikasi

- [ ] `node check-keys.js`: pemilih baru `punya_kunci_publik = 1`.
- [ ] Setup-key menampilkan error jika pengiriman kunci gagal (tidak diam-diam lanjut).
- [ ] Alur lengkap akun baru: login → setup → pilih → suara terkirim 201 → resi.
- [ ] Panel admin: "Suara Masuk" bertambah, Live Audit Log ada entri VOTE_CAST.
- [ ] Verifikasi integritas audit log tetap hijau setelah suara masuk.
- [ ] node --test tetap hijau (jumlah test tidak menyusut).
```
