# DIRECTIVE — Perbaikan Spacing Panel Admin (Election Details & Audit Log)

> Fokus SEMPIT: perbaiki dua halaman yang terasa dempet/sempit. Ini penyetelan
> spacing & ritme tata letak, BUKAN rombak desain. Halaman lain (Overview,
> Pemilih, Create) sudah baik — JANGAN diubah. Murni tampilan, jangan sentuh
> logika/crypto. node --test tetap hijau.

---

## 1. Election Details (`/admin/elections/:id`) — komponen Candidates

**Masalah:** form tambah kandidat (No. Urut / Nama / Visi Misi + tombol Tambah)
dempet, dan daftar kandidat di bawahnya menempel tanpa jarak. Terasa berdesakan.

**Perbaikan:**
- Beri jarak vertikal jelas antara **form tambah kandidat** dan **tabel daftar
  kandidat** (mis. `margin-top: 32px` pada tabel, atau pisahkan jadi dua sub-panel).
- Form input: beri `gap` antar-field yang cukup; field "Nama" & "Visi Misi" boleh
  lebih lebar, "No. Urut" sempit — tapi jangan saling mepet. Sejajarkan tombol
  "Tambah" rapi dengan field (vertical-align center).
- Tabel daftar kandidat: beri padding sel yang lapang, header punya jarak ke baris
  pertama, dan baris punya tinggi nyaman (bukan mepet).
- Beri judul/pemisah jelas: "Tambah Kandidat" (form) vs "Daftar Kandidat" (tabel)
  agar dua bagian tidak terbaca sebagai satu blok.
- Panel "Kontrol Pemilu" dan "Kandidat Terdaftar" beri jarak antar-panel konsisten.

---

## 2. Audit Log (`/admin/audit-log`)

**Masalah:** tombol "Verifikasi Integritas" nempel ke judul; banner hijau menempel
ke header tabel; tabel kosong menganga di bawah. Atas terlalu rapat, bawah kosong.

**Perbaikan:**
- Beri jarak antara **judul "Log Audit"** dan **tombol "Verifikasi Integritas"**
  (tombol sebaiknya sejajar kanan header, seperti pola "Buat Pemilu" di Overview,
  atau diberi `margin-top` cukup bila di bawah judul).
- Beri jarak vertikal antara **banner hijau/merah** dan **header tabel**
  (mis. `margin: 24px 0`).
- Bungkus tabel audit dalam `.table-container` (panel) seperti tabel lain, supaya
  area kosong di bawah tidak terlihat menganga tanpa bingkai.
- **Empty state ramah:** saat belum ada log, tampilkan pesan di tengah area tabel
  ("Belum ada aktivitas tercatat. Log akan muncul saat ada suara masuk atau
  aktivasi pemilih.") alih-alih tabel kosong melompong.

---

## 3. Aturan

- Gunakan token & komponen spacing yang SUDAH ada (jangan bikin sistem baru).
- JANGAN ubah halaman Overview/Pemilih/Create yang sudah baik.
- JANGAN sentuh: crypto-engine/, serialize.js, seal.js, envelope.js, tally,
  penanganan kunci privat, endpoint, skema DB.
- Pertahankan banner verifikasi audit (hijau/merah) & fungsinya.
- Aksesibilitas & responsif tetap terjaga; reduced-motion dihormati.

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE perbaikan spacing panel admin ini. Ini penyetelan SPACING/tata
letak pada DUA halaman saja — bukan rombak desain, bukan halaman lain.

1. Election Details (/admin/elections/:id, komponen Candidates): beri jarak
   vertikal jelas antara form tambah kandidat dan tabel daftar kandidat; rapikan
   gap antar-field & posisi tombol Tambah; padding sel tabel lebih lapang; beri
   judul pemisah "Tambah Kandidat" vs "Daftar Kandidat"; jarak antar-panel konsisten.

2. Audit Log (/admin/audit-log): beri jarak judul<->tombol "Verifikasi Integritas"
   (tombol sejajar kanan header seperti pola Overview); jarak banner<->header tabel;
   bungkus tabel dalam .table-container; tambahkan empty state ramah saat log kosong.

JANGAN ubah Overview/Pemilih/Create (sudah baik). JANGAN sentuh crypto-engine,
serialize.js, seal.js, envelope.js, tally, penanganan kunci privat, endpoint,
skema DB. Pertahankan banner verifikasi audit. Pakai token/komponen yang sudah ada.

Setelah selesai, screenshot kedua halaman & jalankan node --test (harus hijau).
```

---

## §Checklist verifikasi

- [ ] Election Details: form kandidat & tabel tidak lagi dempet; ada jarak jelas.
- [ ] Audit Log: judul/tombol/banner/tabel punya ritme spasi; tidak rapat di atas.
- [ ] Audit Log kosong menampilkan empty state ramah (bukan tabel menganga).
- [ ] Overview/Pemilih/Create TIDAK berubah.
- [ ] Banner verifikasi audit tetap berfungsi.
- [ ] node --test tetap hijau.
```
