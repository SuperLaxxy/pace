# DIRECTIVE — Reset Database Bersih + Prosedur Run Demo

> Tujuan: menghapus SEMUA data uji yang tercemar (pemilu duplikat, suara dua sesi,
> audit log rantai putus) lalu membangun ulang dari NOL agar Verifikasi Integritas
> kembali HIJAU. Skema dibuat ulang otomatis dari schema.sql saat server start.

---

## ⚠️ Sebelum mulai: soal AUDIT_KEY (WAJIB)

Rantai HMAC audit log dihitung dengan `AUDIT_KEY` di `.env`. Agar verifikasi
selalu hijau, **AUDIT_KEY harus SAMA selama umur database**.
- Catat nilai `AUDIT_KEY` Anda sekarang. JANGAN ubah lagi setelah reset.
- Setelah reset DB, semua audit lama hilang, jadi tidak ada konflik kunci lama.
  Cukup pastikan ke depan AUDIT_KEY tidak diubah-ubah.

---

## 1. Cara reset DB yang AMAN (karena memakai WAL)

DB Anda di `server/db/pace.db` dengan mode WAL → ada file pendamping
`pace.db-wal` dan `pace.db-shm`. **Ketiganya harus dihapus bersama**, kalau tidak
data lama bisa muncul lagi.

**Langkah:**
1. **Hentikan server** (Ctrl+C) — file DB tidak boleh dipakai saat dihapus.
2. Jalankan skrip reset (skrip `reset-db.js` di bawah) dari folder `server/`:
   `node reset-db.js`
   Atau hapus manual ketiga file ini dari `server/db/`:
   - `pace.db`
   - `pace.db-wal`
   - `pace.db-shm`
3. Start server lagi → `db.exec(schema)` membuat ulang skema KOSONG & bersih.
4. (Jika ada) jalankan seed admin agar akun admin tersedia kembali
   (admin disimpan di DB, jadi ikut terhapus saat reset — pastikan ter-seed ulang).

---

## 2. Skrip reset (taruh di server/reset-db.js)

```js
// reset-db.js — taruh di server/, jalankan DARI server/: node reset-db.js
// Menghapus file DB + file WAL/SHM pendamping. Server HARUS dimatikan dulu.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'db');
const targets = ['pace.db', 'pace.db-wal', 'pace.db-shm'];

let removed = 0;
for (const f of targets) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('Dihapus:', f);
    removed++;
  }
}
console.log(removed ? `\nSelesai. ${removed} file dihapus. Start server untuk membuat DB bersih.`
                    : '\nTidak ada file DB ditemukan (mungkin sudah bersih).');
console.log('PENTING: pastikan server dimatikan saat menjalankan ini, lalu seed admin ulang.');
```

> Catatan: admin (tabel `admins`) ikut terhapus. Pastikan ada mekanisme seed admin
> dari `.env` saat start, atau jalankan skrip seed admin Anda setelah reset.

---

## 3. PROSEDUR RUN BERSIH (untuk demo & laporan)

Setelah DB bersih & server jalan, lakukan SATU alur penuh ini — inilah yang Anda
rekam/peragakan:

1. **Login admin** (admin / dari .env).
2. **Buat 1 pemilu** rapi: "Pemilihan Ketua HMTI 2026".
   - **UNDUH kunci privat .pem-nya, simpan dengan nama jelas** (mis.
     `kunci-privat-HMTI-2026.pem`). Ini WAJIB untuk tally nanti.
3. **Tambah 2-3 kandidat** berdata lengkap (nomor urut 1..n, nama, visi terisi).
4. **Buka pemilu** (status open).
5. **Registrasi 2-3 pemilih** (catat NIM angka & password), lalu **aktifkan**
   mereka dari panel admin.
6. Untuk tiap pemilih: **logout, bersihkan kunci browser** (`localStorage.clear()`
   di Console F12) agar tidak tertukar antar-akun, lalu **login (pakai NIM angka)
   → setup kunci → pilih → password → suara terkirim → resi**.
7. Buka **Audit Log → Verifikasi Integritas → harus HIJAU**. (Screenshot ini!)
8. **Tutup pemilu** → **Hasil & Tally** → unggah `kunci-privat-HMTI-2026.pem` →
   hasil per kandidat tampil. (Screenshot ini!)

Setelah ini: jangan reset lagi, jangan ubah AUDIT_KEY. Sistem siap dipamerkan.

---

## 4. Aturan keras

- JANGAN ubah schema.sql, crypto-engine, endpoint, penanganan kunci privat.
- Reset hanya MENGHAPUS data, bukan mengubah struktur/logika.
- Setelah reset & run bersih, `node --test` tetap harus hijau (test pakai
  :memory:, tidak terpengaruh file pace.db — laporkan jumlahnya).

---

## §Checklist verifikasi

- [ ] Server dimatikan sebelum hapus DB; pace.db + -wal + -shm terhapus semua.
- [ ] Server start → DB bersih (Overview: 0 pemilih, 0 suara, tidak ada pemilu lama).
- [ ] Admin bisa login (ter-seed ulang).
- [ ] Satu pemilu bersih + kandidat + pemilih + suara berjalan.
- [ ] Verifikasi Integritas audit log HIJAU.
- [ ] Tally berhasil dengan kunci privat pemilu tsb.
- [ ] node --test tetap hijau.
```
