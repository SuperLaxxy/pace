# DIRECTIVE — Bersihkan Pemilu Duplikat + Percantik Audit Log + Kode Tampilan ID

> PENTING: semua perubahan ini AMAN dan TIDAK mengubah skema DB, foreign key,
> atau logika crypto. Data audit log TETAP asli (tidak dipalsukan). node --test
> harus tetap hijau.

---

## 1. Hapus pemilu duplikat (HATI-HATI dengan yang punya suara)

**Kondisi:** ID 1 "Test Election" (open), ID 2 "...Teknik Informatika" (closed,
PUNYA SUARA), ID 3-12 duplikat draft.

**Aturan:**
- Hapus HANYA pemilu duplikat berstatus `draft` (ID 3-12).
- JANGAN hapus ID 1 (diminta tetap ada).
- JANGAN hapus pemilu yang punya suara/ballot (ID 2 closed) — menghapusnya bisa
  memutus referensi & memperparah audit log. Kalau ingin disisakan untuk demo
  tally, biarkan. (Kalau benar-benar ingin dihapus, lakukan via run bersih total,
  bukan hapus sebagian.)

**Cara aman menghapus draft duplikat:** buat skrip Node read-write terpisah ATAU
endpoint admin DELETE yang HANYA mengizinkan hapus pemilu berstatus `draft` tanpa
ballot. JANGAN hapus sembarangan via query manual yang bisa salah.

> Catatan: cara paling bersih & paling aman untuk demo tetaplah RESET TOTAL DB
> lalu satu run bersih (butuh server/db/index.js — kirimkan). Hapus-sebagian
> hanya menutupi gejala.

---

## 2. Percantik tampilan Live Audit Log (DATA TETAP ASLI)

**Penting:** gambar referensi "Vote Received & Verified / Voter Activated /
1.245 pemilih" itu MOCKUP STATIS dengan DATA PALSU. JANGAN tiru datanya. Aplikasi
React menampilkan audit log ASLI dari API — itu yang benar. Hanya perindah
TAMPILANNYA, jangan palsukan isinya.

**Perbaikan (komponen audit log / Overview):**
- Petakan `event_type` ke judul ramah Bahasa Indonesia:
  - `VOTE_CAST` → "Suara Diterima & Terverifikasi" + subteks "Tanda tangan valid.
    HMAC valid. Ditambahkan ke kotak suara anonim."
  - `VOTER_ACTIVATED` (jika ada) → "Pemilih Diaktivasi".
  - tipe lain → judul wajar masing-masing.
- Tampilkan MAC sebagai chip mono dipotong (mis. `mac: 1a5e857d…c98b`).
- Format waktu jadi ramah ("Baru saja", "x menit lalu", atau timestamp lokal).
- Ikon ceklis untuk event terverifikasi.
- SEMUA nilai tetap diambil dari endpoint asli (`/api/admin/audit-log`). JANGAN
  hardcode angka/teks contoh.

---

## 3. Kode tampilan ID pemilu (TANPA ubah DB)

**Permintaan:** tampilkan ID seperti "ELC-2026-01", bukan angka.

**ATURAN KERAS:** JANGAN ubah primary key / skema / foreign key. ID asli di
database TETAP angka (dipakai semua relasi: ballots, eligibility, candidates,
audit). Buat HANYA format TAMPILAN:
- Di UI, render ID sebagai `ELC-2026-{id dengan padding 2 digit}` → ID 1 jadi
  "ELC-2026-01", ID 2 jadi "ELC-2026-02", dst.
- Helper kecil: `formatElectionCode(id)` → `` `ELC-2026-${String(id).padStart(2,'0')}` ``.
- Pakai di tabel pemilu (Overview, Hasil & Tally, Election Details). Operasi
  internal (link, fetch, vote, tally) TETAP memakai ID angka asli.

JANGAN kirim "ELC-2026-01" ke endpoint mana pun — itu hanya untuk ditampilkan.

---

## 4. Aturan keras

- JANGAN ubah: skema DB, primary/foreign key, crypto-engine, endpoint vote/tally,
  penanganan kunci privat, logika audit/verify.
- Audit log: percantik tampilan saja, data tetap dari API asli (tidak dipalsukan).
- `node --test` harus tetap hijau (laporkan jumlahnya).

---

## §Directive (tempel ke Antigravity)

```
Tiga perbaikan AMAN di panel admin. JANGAN ubah skema DB, primary/foreign key,
crypto-engine, endpoint vote/tally, atau penanganan kunci privat. node --test
harus tetap hijau.

1. HAPUS PEMILU DUPLIKAT: hapus HANYA pemilu duplikat berstatus 'draft' (mis. ID
   3-12). JANGAN hapus ID 1 "Test Election". JANGAN hapus pemilu yang punya
   ballot/suara (ID 2 closed). Lakukan lewat skrip Node read-write terpisah atau
   endpoint admin DELETE yang hanya mengizinkan hapus pemilu draft tanpa ballot —
   bukan query manual sembarangan.

2. PERCANTIK LIVE AUDIT LOG (data tetap ASLI dari /api/admin/audit-log, JANGAN
   palsukan/hardcode): petakan event_type ke judul ramah — VOTE_CAST -> "Suara
   Diterima & Terverifikasi" (subteks: Tanda tangan valid. HMAC valid. Ditambahkan
   ke kotak suara anonim.), VOTER_ACTIVATED -> "Pemilih Diaktivasi". Tampilkan MAC
   sebagai chip mono dipotong, waktu ramah ("x menit lalu"), ikon ceklis.

3. KODE TAMPILAN ID: JANGAN ubah ID asli di DB (tetap angka, dipakai semua relasi).
   Buat helper formatElectionCode(id) = `ELC-2026-${String(id).padStart(2,'0')}`
   dan pakai HANYA untuk menampilkan di tabel pemilu (Overview, Hasil & Tally,
   Detail). Semua link/fetch/vote/tally tetap pakai ID angka asli. Jangan kirim
   "ELC-2026-01" ke endpoint apa pun.

Verifikasi: duplikat draft hilang (ID 1 tetap ada, pemilu bersuara tidak terhapus);
audit log menampilkan judul ramah dari data asli; ID tampil "ELC-2026-01" dst tapi
navigasi/tally tetap berfungsi. node --test hijau (laporkan jumlah).
```

---

## §Checklist verifikasi

- [ ] Pemilu duplikat draft terhapus; ID 1 "Test Election" tetap ada.
- [ ] Pemilu yang punya suara TIDAK terhapus.
- [ ] Audit log: judul ramah, MAC chip, waktu ramah — TAPI data dari API asli
      (bukan "1.245"/contoh palsu).
- [ ] ID tampil "ELC-2026-01" dst; klik "Kelola"/tally tetap jalan (pakai ID asli).
- [ ] node --test tetap hijau.
```
