# DIRECTIVE — Halaman "Hasil & Tally" Panel Admin

> Tujuan: membuat UI untuk fitur penghitungan suara yang BACKEND-nya SUDAH ADA
> (`POST /api/admin/elections/:id/tally`). Ini melengkapi alur hidup sistem:
> buat pemilu -> pilih -> tutup -> HITUNG HASIL dengan aman.
> Penanganan kunci privat = bagian paling sensitif. Ikuti aturan keras.
> JANGAN ubah logika crypto/tally backend. node --test tetap hijau.

---

## 1. Konteks penting (jangan dilanggar)

- Backend tally SUDAH LENGKAP & lulus test: `POST /api/admin/elections/:id/tally`
  menerima `{ privateKeyPem }`, memverifikasi tanda tangan tiap ballot, membuka
  kunci via RSA, mendekripsi, menghitung per kandidat, melaporkan invalid.
  JANGAN ubah endpoint ini.
- **Confidentiality by design:** server TIDAK menyimpan kunci privat RSA. Kunci
  privat hanya dipegang KPU (diunduh sekali saat membuat pemilu) dan dikirim
  HANYA saat tally. Ini inti keamanan — UI harus menghormatinya.
- Pemilu harus berstatus `closed` sebelum tally (endpoint sudah menolak bila belum).

---

## 2. Halaman yang dibuat

Tambah menu sidebar "Hasil & Tally" (atau akses via tombol "Tally" di Election
Details saat status `closed`). Buat komponen `Tally`/`Results` di `client/src/admin/`.

Alur halaman:
1. Pilih pemilu yang sudah `closed` (atau masuk dari Election Details).
2. **Unggah / tempel kunci privat RSA KPU** (file .pem yang diunduh saat membuat
   pemilu) — input file atau textarea.
3. Tombol "Hitung Suara" → kirim `POST /api/admin/elections/:id/tally` dengan
   `{ privateKeyPem }` + header Authorization admin.
4. Tampilkan hasil: jumlah suara per kandidat (pakai NAMA kandidat, bukan hanya
   id), total suara sah (`validCount`), dan daftar suara tidak sah
   (`invalidCount` + `invalidBallots` dengan alasannya).
5. State async: loading saat menghitung, error jelas bila kunci salah/format salah.

---

## 3. ATURAN KERAS penanganan kunci privat (KRITIS)

- Kunci privat RSA **HANYA** dipakai di memori untuk satu request tally, lalu
  **DIBUANG dari state** segera setelah selesai. JANGAN simpan ke localStorage,
  state global, file, atau DB. JANGAN log ke console.
- JANGAN kirim kunci privat ke endpoint lain selain `/tally`.
- Setelah hasil ditampilkan, pastikan variabel/state yang menampung kunci privat
  di-clear (kosongkan), termasuk isi input.
- Beri peringatan UI ke admin: kunci privat hanya dipakai untuk menghitung &
  tidak disimpan.

---

## 4. Pemetaan id -> nama kandidat

Backend mengembalikan `results` sebagai `{ candidateId: count }`. Ambil daftar
kandidat (`GET /api/admin/elections/:id/candidates`) untuk memetakan id -> nama,
agar hasil tampil sebagai "Alice: 12 suara", bukan "id 1: 12".

---

## 5. Aturan keras lain

- JANGAN ubah: endpoint `/tally`, crypto-engine (rsa, ecdsa, serialize, seal,
  envelope, audit-chain), logika verifikasi, skema DB.
- Ini murni UI yang MEMAKAI endpoint yang sudah ada.
- `node --test` harus tetap hijau (laporkan jumlah test).

---

## §Directive (tempel ke Antigravity)

```
Buat halaman "Hasil & Tally" di panel admin yang MEMAKAI endpoint backend yang
SUDAH ADA: POST /api/admin/elections/:id/tally. Jangan ubah endpoint atau logika
crypto/tally apa pun.

1. Tambah menu sidebar "Hasil & Tally" + komponen Tally/Results di client/src/admin/.
2. Alur: pilih pemilu berstatus closed -> unggah/tempel kunci privat RSA KPU (.pem)
   -> tombol "Hitung Suara" -> POST /api/admin/elections/:id/tally dengan
   { privateKeyPem } + Authorization admin -> tampilkan hasil.
3. Tampilkan hasil per kandidat memakai NAMA (petakan results {id:count} dengan
   GET /api/admin/elections/:id/candidates), total suara sah, dan daftar suara
   tidak sah beserta alasannya. State loading & error yang jelas.

ATURAN KERAS KEAMANAN (WAJIB):
- Kunci privat RSA hanya di memori untuk satu request tally, lalu DIBUANG dari
  state & input segera setelah selesai. JANGAN simpan ke localStorage/state
  global/DB/file. JANGAN console.log kunci privat. JANGAN kirim ke endpoint lain.
- Beri peringatan UI bahwa kunci privat tidak disimpan.

JANGAN ubah endpoint /tally, crypto-engine, skema DB. node --test harus tetap
hijau (laporkan jumlahnya). Gunakan token admin dengan key localStorage yang
konsisten ('adminToken').

Verifikasi: pada pemilu yang sudah ada suaranya -> tutup pemilu -> buka Hasil &
Tally -> unggah kunci privat yang benar -> hasil per kandidat tampil dengan benar;
coba juga kunci salah -> error jelas (bukan crash). Konfirmasi state kunci privat
ter-clear setelah selesai.
```

---

## §Checklist verifikasi

- [ ] Menu "Hasil & Tally" muncul; halaman bisa diakses untuk pemilu closed.
- [ ] Unggah kunci privat benar -> hasil per kandidat tampil (pakai nama).
- [ ] Suara sah & tidak sah dilaporkan dengan benar.
- [ ] Kunci privat salah -> error jelas, tidak crash.
- [ ] Kunci privat TIDAK tersimpan (cek: tidak ada di localStorage, state clear
      setelah selesai, tidak ada di console).
- [ ] Pemilu harus closed dulu (tidak bisa tally saat masih open).
- [ ] node --test tetap hijau.
```
