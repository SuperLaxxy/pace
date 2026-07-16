# DIRECTIVE FIX — Login Admin "Forbidden" + Bug Integrasi Pemilih

> Untuk Antigravity. Ini perbaikan BUG, bukan fitur baru. Ikuti hipotesis
> berurutan, BUKTIKAN perbaikan dengan tes nyata, JANGAN sentuh logika crypto.

---

## Gejala

`POST http://localhost:3000/api/admin/login` (ditembak LANGSUNG ke backend,
melewati Vite) dengan body `{"username":"admin","password":"password123"}`
mengembalikan `{"error":"Forbidden: Admin access required"}`.

## Fakta yang sudah dipastikan (jangan diulang)

- Akun admin ADA di tabel `admins` (username `admin`) — bukan masalah data.
- `.env` berisi `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=password123`.
- Di `server/routes/admin.js`, `router.post('/login', ...)` SUDAH berada SEBELUM
  `router.use(authorizeAdmin)` — urutan di file ini benar.
- `server/index.js` me-mount dengan `app.use('/api/admin', adminRoutes)` (bersih).
- Pesan "Forbidden: Admin access required" HANYA diproduksi oleh middleware
  `authorizeAdmin` di `server/middleware/auth.js`.
- Baris 1 admin.js sudah diperbaiki dari `clear('express')` menjadi `require('express')`.

**Kesimpulan logis:** karena kode di disk seharusnya tidak bisa menghasilkan
"Forbidden" untuk `/login`, maka yang dieksekusi BUKAN kode disk saat ini
(proses Node basi), ATAU `authorizeAdmin` dipasang dari tempat lain yang belum
terlihat. Selidiki berurutan.

---

## Hipotesis & langkah (kerjakan BERURUTAN, berhenti saat ketemu)

**H1 — Proses Node basi (paling mungkin).**
- Matikan SEMUA proses node yang berjalan (Windows: `taskkill /F /IM node.exe`,
  atau tutup semua tab terminal node di IDE).
- Start server BERSIH (`npm run dev` atau `node server/index.js` sesuai konfigurasi).
- Pastikan muncul "PACE Server running on port 3000" TANPA error/stack trace saat start.
- Uji ulang (lihat §Bukti). Jika dapat token → SELESAI.

**H2 — `authorizeAdmin` dipanggil dari tempat lain.**
- Cari SELURUH repo: `authorizeAdmin` dan `app.use(`. Periksa apakah ada
  pemasangan global/mount-level seperti `app.use('/api/admin', authorizeAdmin, ...)`
  atau `app.use(authorizeAdmin)` di `server/index.js` atau file lain.
- Jika ada yang mencegat sebelum `/login`, perbaiki agar `/login` tetap publik.

**H3 — File admin.js ganda / yang di-require berbeda.**
- Cari apakah ada lebih dari satu `admin.js` (mis. di folder lain) atau file
  yang sebenarnya di-`require` oleh `index.js` berbeda dari yang diedit.
- Pastikan `require('./routes/admin')` menunjuk ke file yang benar.

**H4 — Route `/login` tidak terdaftar karena error muat modul.**
- Cek log start server: apakah ada error saat `require('./routes/admin')`?
  Jika router gagal dimuat sebagian, `/login` tak terdaftar dan request jatuh
  ke handler lain. Perbaiki error muat apa pun.

---

## §Bukti perbaikan (WAJIB — jangan hanya klaim "fixed")

Setelah perbaikan, jalankan tes LANGSUNG ke backend (bukan lewat browser):
```
Invoke-RestMethod -Uri http://localhost:3000/api/admin/login -Method Post -ContentType "application/json" -Body '{"username":"admin","password":"password123"}'
```
HARUS mengembalikan objek berisi `token` (JWT). Tampilkan output ini sebagai bukti.
Lalu konfirmasi login admin berhasil dari browser di `/admin/login` dan masuk ke dashboard.

---

## Bug integrasi pemilih yang HARUS sekalian diperbaiki

Saat menelusuri, perbaiki juga ini (sudah teridentifikasi dari kode):

**B1 — "Voter: Unknown" & suara gagal (binding identitas).**
Dashboard pemilih membaca `localStorage.getItem('voter_nim')`, tapi kunci itu
tidak pernah di-set saat login. Dan `Vote.jsx` butuh `signerPublicKeyId` dari
`localStorage.getItem('voter_id')`. Perbaiki: saat login pemilih berhasil
(`voter/Login.jsx`), SIMPAN identitas pemilih secara konsisten (mis. `voter_id`
dan `voter_nim` dan `token`), dan pastikan Dashboard + Vote.jsx MEMBACA kunci
yang sama. Tanpa ini, header tampil "Unknown" dan pengiriman suara gagal.

**B2 — `electionId` hardcoded 'elec-123'.**
Dashboard pemilih memakai `const electionId = 'elec-123'` yang tidak ada di DB,
sehingga fetch kunci publik gagal ("Gagal mengambil kunci publik dari KPU").
Perbaiki: ambil pemilu yang sedang berstatus `open` dari API (mis. endpoint
daftar pemilu) dan gunakan ID aslinya, bukan ID karangan.

**B3 — Hapus fallback mock yang menyamarkan kegagalan.**
Di Dashboard pemilih masih ada `catch` yang mengisi kandidat dummy saat API
gagal. Hapus agar kegagalan nyata terlihat (jangan tampilkan data palsu).

**B4 — Data dashboard admin masih hardcode.**
Angka "1.245" / "856" dan Live Audit Log contoh di Dashboard admin masih statis.
Bind ke API asli: jumlah pemilih (`/api/admin/voters`), status integritas
(`/api/admin/audit-log/verify`), dan audit log (`/api/admin/audit-log`).

---

## Aturan keras

- JANGAN ubah `crypto-engine/`, `serialize.js`, `seal.js`, `envelope.js`, logika
  tally, penanganan kunci privat (modal & purge), atau skema DB.
- Ini perbaikan binding/routing/integrasi, BUKAN kriptografi.
- Jalankan `node --test` setelah selesai — HARUS tetap hijau (semua test lulus).

## Checklist verifikasi (manusia)

- [ ] `Invoke-RestMethod` ke /api/admin/login mengembalikan token.
- [ ] Login admin dari browser berhasil → masuk dashboard.
- [ ] Header pemilih menampilkan identitas asli (bukan "Voter: Unknown").
- [ ] Alur memilih lengkap berhasil di browser (login → pilih → password →
      suara terkirim 201 → resi).
- [ ] Dashboard admin menampilkan angka & audit log dari data ASLI.
- [ ] `node --test` tetap hijau.
