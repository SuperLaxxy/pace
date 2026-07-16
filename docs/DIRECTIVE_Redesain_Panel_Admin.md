# DIRECTIVE — Redesain UI/UX Panel Admin PACE

> Fokus: rapikan & seragamkan tampilan panel admin agar konsisten dengan sistem
> desain yang sudah ada (referensi: Overview, Pemilih, Audit Log yang sudah rapi),
> dan PERBAIKI dua halaman yang form-nya telanjang. Murni lapisan tampilan —
> JANGAN sentuh logika/crypto. node --test harus tetap hijau.

---

## 1. Diagnosis

- **Overview, Pemilih, Audit Log** sudah rapi (sidebar, stat card, tabel, badge,
  banner verifikasi hijau) — jadikan ini ACUAN konsistensi.
- **RUSAK (prioritas):** `/admin/elections/create` (CreateElection) dan
  `/admin/elections/:id` (komponen Candidates) form-nya TELANJANG — input & tombol
  tanpa style, mirip bug admin/login dulu. Jelas tidak memakai class sistem desain
  (`.form-control`, `.form-group`, `.form-label`, `.btn`, `.panel`).
- Beberapa tombol/teks belum konsisten (mis. tombol input inline, badge status).

---

## 2. Token & komponen (gunakan yang SUDAH ADA, jangan bikin baru)

Pakai design tokens & class yang sudah dipakai halaman Overview/Pemilih:
`--bg-*`, `--surface`, `--border`, gradien biru→ungu untuk `.btn-primary`,
`--encrypted` (hijau) untuk status valid, `--font-mono` untuk hash/MAC.
Komponen yang sudah ada & harus dipakai ulang: `.stat-card`, `.table-container` +
`table`, `.status-badge status-*`, `.panel`, `.form-group`, `.form-label`,
`.form-control`, `.btn .btn-primary/.btn-secondary/.btn-danger/.btn-outline`,
`.sidebar`, `.dashboard-header`.

---

## 3. Perbaikan per-halaman

**A. CreateElection (`/admin/elections/create`) — RUSAK, prioritas**
- Bungkus dalam `.panel` / `.glass-card`, terpusat (`.container`, max-width wajar).
- Field "Judul Pemilu", "Waktu Mulai", "Waktu Selesai" pakai `.form-group` +
  `.form-label` + `.form-control` (bukan input telanjang).
- Tombol "Buat Pemilu" pakai `.btn .btn-primary`.
- Pertahankan UTUH logika modal kunci privat (UX Kritis M4) — hanya rapikan
  tampilannya, jangan ubah perilaku (blocking + checkbox + tidak persist kunci).

**B. Candidates (di `/admin/elections/:id`) — RUSAK, prioritas**
- Form tambah kandidat (No. Urut, Nama, Visi Misi) pakai `.form-group` +
  `.form-control`; tombol "Tambah Kandidat" pakai `.btn .btn-primary`.
- Tampilkan daftar kandidat sebagai tabel/kartu rapi (No, Nama, Visi-Misi).
- Tata letak form rapi (grid/stack), bukan input berjajar mepet.

**C. ElectionDetails (`/admin/elections/:id`)**
- Header pemilu + badge status konsisten (`status-open/closed/draft`).
- "Kontrol Pemilu" dan "Kandidat" sebagai panel terpisah yang rapi.
- HAPUS fallback mock di `fetchElection` (jangan tampilkan data palsu saat API gagal).

**D. Overview, Pemilih, Audit Log (sudah rapi)**
- Samakan detail kecil: spacing, badge, tombol. Pastikan "Export Log" benar-benar
  berfungsi (atau sembunyikan kalau belum diimplementasi — jangan tombol palsu
  yang hanya `alert`).
- Audit Log: pertahankan banner verifikasi hijau/merah (fitur penting BAB 4).

---

## 4. Polish & UX (tasteful, jangan berlebihan)

- Hover lift pada kartu & baris tabel; tombol gradien dengan hover/active/focus ring.
- State async lengkap: loading (spinner), sukses, error inline yang jelas &
  actionable (ganti `alert()` dengan notifikasi/inline message).
- Empty state ramah (mis. "Belum ada kandidat" dengan ajakan tambah).
- Konfirmasi aksi ireversibel tetap ada (tutup pemilu).
- Aksesibilitas: fokus keyboard terlihat, kontras AA, `prefers-reduced-motion`.
- Responsif: sidebar jadi menu ringkas di mobile; tabel bisa di-scroll.
- Semua teks Bahasa Indonesia, konsisten.

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE redesain panel admin ini. Ini PERBAIKAN TAMPILAN panel admin saja.

1. PERBAIKI halaman yang form-nya telanjang (prioritas):
   - CreateElection (/admin/elections/create): bungkus dalam panel terpusat,
     pakai .form-group/.form-label/.form-control untuk semua field, .btn-primary
     untuk tombol. Pertahankan UTUH logika modal kunci privat (jangan ubah perilaku).
   - Candidates (di /admin/elections/:id): form tambah kandidat pakai class form
     yang sama; tampilkan daftar kandidat sebagai tabel rapi.
   - ElectionDetails: panel kontrol & kandidat rapi; HAPUS fallback mock data.

2. SERAGAMKAN seluruh panel admin dengan sistem desain yang sudah dipakai
   Overview/Pemilih/Audit Log (tokens & class yang sudah ada — jangan bikin token
   baru). Pertahankan banner verifikasi audit log hijau/merah.

3. POLISH tasteful: hover lift kartu/baris, tombol gradien hover/active/focus,
   ganti semua alert() dengan notifikasi/inline error, empty state ramah,
   state loading. Hormati reduced-motion, fokus terlihat, kontras AA, responsif.

4. Hilangkan tombol palsu: "Export Log" harus benar-benar berfungsi atau
   disembunyikan (jangan hanya alert).

DILARANG mengubah: crypto-engine/, serialize.js, seal.js, envelope.js, logika
tally, penanganan kunci privat, endpoint backend, skema DB. node --test harus
tetap hijau. Semua teks Bahasa Indonesia.

Setelah selesai, screenshot tiap halaman admin & jalankan node --test.
```

---

## §Checklist verifikasi

- [ ] /admin/elections/create: form ter-styling penuh (tidak telanjang), terpusat.
- [ ] Candidates: form & daftar kandidat rapi.
- [ ] Seluruh panel admin konsisten dengan Overview/Pemilih/Audit Log.
- [ ] alert() diganti notifikasi/inline; tombol palsu dihapus/disembunyikan.
- [ ] Banner verifikasi audit log tetap berfungsi (hijau/merah).
- [ ] Modal kunci privat tetap memblokir & tidak persist kunci (perilaku M4 utuh).
- [ ] Hover/fokus/responsif/reduced-motion oke.
- [ ] node --test tetap hijau (logika tidak tersentuh).
```
