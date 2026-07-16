# DIRECTIVE FIX — Cegah Pemilu Duplikat + Rapikan Tally + Prosedur Demo Bersih

> Akar masalah: data uji menumpuk (9 pemilu duplikat, audit log tercampur), dan
> form "Buat Pemilu" bisa submit ganda. Perbaiki PENYEBABNYA, bukan hanya gejala.
> JANGAN sentuh crypto/tally/skema. node --test tetap hijau.

---

## 1. 🔴 Bug: pemilu duplikat saat "Buat Pemilu"

**Gejala:** 9 pemilu berjudul sama (ID 2-9). Bahaya: tiap pemilu punya kunci
privat RSA SENDIRI — duplikat membuat kunci tertukar saat tally → dekripsi gagal.

**Penyebab mungkin:** tombol "Buat Pemilu" bisa diklik berkali-kali / submit ganda
(tidak di-disable saat loading), atau handler ter-trigger lebih dari sekali.

**Perbaikan (CreateElection.jsx):**
- Disable tombol "Buat Pemilu" segera saat diklik (state `loading`), aktifkan lagi
  hanya setelah response selesai. Cegah double-submit.
- Setelah sukses, redirect ke halaman kelola pemilu / detail (jangan biarkan user
  di form yang sama menekan lagi).
- Tampilkan error jelas bila gagal; jangan diam.
- (Opsional, jika mudah) peringatkan bila judul identik dengan pemilu draft yang
  baru dibuat < beberapa detik lalu.

JANGAN ubah endpoint `POST /api/admin/elections` atau cara generate kunci RSA.

---

## 2. 🟡 Rapikan halaman Tally (admin/elections/:id/tally)

**Gejala:** input "Choose File" & tombol "Mulai Tally" telanjang, banner polos.

**Perbaikan (komponen Tally):**
- Bungkus dalam panel terpusat sesuai sistem desain (seperti CreateElection yang
  sudah rapi). Banner peringatan kunci privat pakai gaya warning yang konsisten.
- Input file & tombol pakai `.btn`/`.form-control`. Tombol "Mulai Tally" disable
  saat proses berjalan (state loading + teks "Menghitung…").
- Tampilkan HASIL setelah tally: per kandidat pakai NAMA (petakan dengan
  GET /api/admin/elections/:id/candidates), total suara sah, daftar suara tidak
  sah + alasan.
- Error kunci salah → pesan jelas, bukan crash.
- PERTAHANKAN aturan keamanan: kunci privat hanya di memori, di-clear setelah
  selesai, tidak disimpan/di-log. (Sudah benar — jangan diubah jadi menyimpan.)

---

## 3. Aturan keras

- JANGAN ubah: crypto-engine/, endpoint /tally & /elections, penanganan kunci
  privat (harus tetap tidak disimpan), skema DB, logika audit/verify.
- Ini perbaikan double-submit + tampilan + penanganan hasil. node --test hijau
  (laporkan jumlahnya).

---

## §Directive (tempel ke Antigravity)

```
Perbaiki dua hal di panel admin. JANGAN sentuh crypto-engine, endpoint /tally &
/elections, penanganan kunci privat, atau skema DB. node --test harus tetap hijau.

1. CEGAH PEMILU DUPLIKAT (CreateElection.jsx): disable tombol "Buat Pemilu" saat
   diklik (state loading) sampai response selesai, untuk mencegah double-submit;
   setelah sukses redirect ke detail/kelola pemilu; tampilkan error jelas bila gagal.
   Jangan ubah endpoint atau generate kunci RSA.

2. RAPIKAN HALAMAN TALLY (komponen Tally): bungkus dalam panel terpusat sesuai
   design system; input file & tombol pakai class .btn/.form-control; tombol
   disable + "Menghitung…" saat proses; tampilkan hasil per kandidat memakai NAMA
   (GET /api/admin/elections/:id/candidates), total suara sah, dan daftar suara
   tidak sah + alasan; error kunci salah -> pesan jelas, bukan crash.
   PERTAHANKAN: kunci privat hanya di memori, di-clear setelah selesai, tidak
   disimpan/di-log.

Verifikasi: buat 1 pemilu (klik cepat ganda -> hanya 1 yang terbuat); pada pemilu
closed yang ada suaranya, jalankan tally dengan kunci privat benar -> hasil per
kandidat tampil; kunci salah -> error jelas. node --test hijau (laporkan jumlah).
```

---

## 4. 🧹 PROSEDUR DEMO BERSIH (lakukan manual sebelum sidang)

Data Anda sudah tercampur dari banyak percobaan. Sebelum demo/laporan, lakukan
SATU run bersih agar audit log hijau & tally cocok. (Saya butuh `server/db/index.js`
untuk memberi cara aman mengosongkan DB — kirimkan.)

Garis besar setelah DB bersih & `AUDIT_KEY` tetap konsisten:
1. Buat 1 pemilu rapi (mis. "Pemilihan Ketua HMTI 2026") — **unduh & simpan kunci
   privat .pem-nya, beri nama jelas sesuai pemilu** (agar tidak tertukar saat tally).
2. Tambah 2-3 kandidat berdata lengkap (nomor urut, nama, visi).
3. Buka pemilu (status open).
4. Registrasi + aktifkan beberapa pemilih; tiap pemilih memilih sekali.
5. Cek Audit Log → Verifikasi Integritas → **harus HIJAU**.
6. Tutup pemilu → Hasil & Tally → unggah kunci privat **pemilu itu** → hasil tampil.
7. Inilah skenario yang Anda rekam/peragakan untuk sidang.

---

## §Checklist verifikasi

- [ ] Klik "Buat Pemilu" cepat-ganda hanya menghasilkan 1 pemilu.
- [ ] Halaman Tally rapi & ber-style; tombol disable saat menghitung.
- [ ] Hasil tally tampil per NAMA kandidat + suara sah/tidak sah.
- [ ] Kunci privat salah -> error jelas, tidak crash; kunci tidak tersimpan.
- [ ] (Setelah run bersih) Verifikasi Integritas audit log HIJAU.
- [ ] node --test tetap hijau.
```
