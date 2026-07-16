# DIRECTIVE M5.6 — Port Desain Referensi ke Aplikasi React

> Tujuan: menerapkan tampilan dari mockup HTML statis (folder `Pace E-Voting/`,
> yang sudah disetujui) ke aplikasi React `pace/client` yang berfungsi — TANPA
> mengubah logika crypto/backend/keamanan yang sudah lulus review.
>
> Pola: tempel **§Directive** ke Antigravity, review hasil terhadap **§Checklist**.

---

## 0. Prinsip inti (baca dulu)

Mockup `Pace E-Voting/` = **sumber kebenaran VISUAL**.
Aplikasi `pace/client` = **sumber kebenaran FUNGSIONAL** (crypto, state, API).

Tugasnya menyatukan keduanya: ambil CSS/markup/komponen dari mockup, terapkan ke
komponen React yang sudah ada, **pertahankan seluruh logika React/crypto apa adanya**.

**DILARANG KERAS:**
- Mengubah penanganan kunci privat (modal kunci M4, purge kunci di Tally).
- Mengubah `crypto/` klien, `serialize.js`, `seal.js`, alur sign/encrypt.
- Mengubah endpoint backend, auth, atau logika tally.
- Menambah klaim keamanan absolut.

Ini murni lapisan presentasi.

---

## 1. Design Tokens (turunkan dari mockup; taruh di `:root`)

```css
:root {
  /* Base — navy near-black */
  --bg-900:  #080B14;   /* latar halaman */
  --bg-800:  #0E1322;   /* section */
  --surface: #141A2B;   /* kartu/panel */
  --surface-2:#1A2236;  /* nested / hover */
  --border:  #232C44;   /* hairline */

  /* Primary — gradien biru -> ungu (CTA & kata aksen judul) */
  --grad-from:#4F7CFF;
  --grad-to:  #9B5CF6;
  /* dipakai: linear-gradient(135deg, var(--grad-from), var(--grad-to)) */
  --primary:  #5B7CFF;  /* solid fallback */

  /* Crypto/status */
  --encrypted:#34D399;  /* "Terenkripsi", "Valid", checkmark */
  --success:  #34D399;
  --danger:   #F26D6D;
  --warning:  #E2B14C;

  /* Tile ikon (pilar & stat) */
  --tile-blue:#1E2A52;   --tile-blue-ink:#6E8BFF;
  --tile-purple:#2A2150; --tile-purple-ink:#A78BFA;
  --tile-teal:#15322E;   --tile-teal-ink:#34D399;
  --tile-amber:#332814;  --tile-amber-ink:#E2B14C;

  /* Teks */
  --text-100:#EEF1F8;
  --text-300:#9AA6C4;
  --text-500:#5E6A86;

  /* Tipografi */
  --font-display:'Plus Jakarta Sans', system-ui, sans-serif; /* bobot 700-800 */
  --font-body:   'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono:   'JetBrains Mono', ui-monospace, monospace;   /* chip hash/algoritma */

  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-xl:20px;
  --shadow:0 10px 30px rgba(0,0,0,.4);
}
```

Jika nilai persis di mockup berbeda, **ambil dari mockup** (mockup yang menang).

---

## 2. Pola komponen yang harus direplikasi dari mockup

- **Nav landing:** wordmark "PACE." (titik beraksen), link tengah, tombol ghost
  "Masuk" + tombol gradien "Registrasi".
- **Tombol primer:** isi gradien biru→ungu, radius `--r-md`, bobot 600.
- **Tombol sekunder:** outline `--border`.
- **Kata aksen di judul:** gradien biru→ungu (text gradient) pada kata kunci
  ("Pemilu Mahasiswa", "Simpel & Aman", "Inti").
- **Live Ballot Box (hero):** kartu header titik lampu + label, daftar baris
  (ikon gembok + tag algoritma mono + timestamp + badge hijau "Terenkripsi").
  Di landing = ILUSTRATIF (data contoh), beri tanda jelas ini demo.
- **Kartu pilar:** tile ikon bertint + judul + deskripsi + chip mono algoritma
  di bawah (AES-256-CBC / HMAC-SHA256 / ECDSA P-256 / Arch Isolation).
- **Kartu ghost-number:** angka 01-04 besar opasitas rendah (urutan SAH).
- **Sidebar admin:** logo atas, item nav (ikon+label, state aktif = bar aksen
  kiri + bg tint), kartu profil "Admin KPU / Superuser" di bawah.
- **Stat card:** tile ikon + label + angka besar; kartu integritas teks hijau.
- **Tabel data:** header uppercase redup, baris bersih, badge status pill
  (Dibuka=hijau, Draft=abu, Ditutup=gold).
- **Audit timeline:** ikon (check/person) + judul + deskripsi + chip mono
  `mac: e7d9...4f2a` + timestamp kanan.
- **Banner sukses voter:** tint hijau, ikon perisai, "Kunci Kriptografi Siap".
- **Kartu kandidat:** badge nomor pojok, avatar/placeholder, nama paslon tebal,
  visi italic, tombol gradien "Pilih [Nama]".

---

## 3. Data ASLI, bukan mock (penting)

Mockup memakai angka & log palsu. Saat di-port ke React, **bind ke API asli**:
- "Pemilih Terdaftar", "Suara Masuk" → hitung dari endpoint admin (`/voters`,
  jumlah ballots) — JANGAN hardcode 1.245 / 856.
- "Status Integritas Valid (HMAC Checked)" → dari `/audit-log/verify`.
- Live Audit Log → dari `/audit-log` (data nyata).
- Kartu kandidat, judul pemilu, status → dari endpoint pemilu/kandidat.
- Live Ballot Box di landing (sebelum login) boleh ilustratif/demo, tapi tandai
  jelas sebagai contoh (jangan mengesankan pemilu nyata sedang berjalan).

---

## 4. Halaman yang TIDAK ada di mockup — terapkan bahasa desain yang sama

Mockup hanya menampilkan landing, voter dashboard, admin overview. Terapkan
token & komponen yang sama secara konsisten ke:
- **Login & Register pemilih**, **Login admin** (yang sebelumnya rusak — beri
  kartu penuh bergaya panel KPU).
- **Konfirmasi Vote** (tampilkan nama kandidat; state "Menyegel…" saat kirim;
  gagal = pesan jujur, jangan pura-pura sukses).
- **Receipt** (kartu resi dengan hash mono + tombol Salin).
- **Tally** (unggah .pem, hasil per NAMA kandidat + daftar invalid; purge kunci
  dari state setelah selesai — JANGAN ubah logika ini).
- **Voters & Pemilu/Kandidat & Hasil/Tally & Audit Log** di panel admin.

---

## 5. Aturan UX & kualitas (pertahankan)

- State async lengkap: loading / sukses / error inline yang jelas & actionable.
- Empty state (belum ada pemilu/kandidat) = ajakan bertindak.
- Microcopy aktif, Bahasa Indonesia, sentence case, konsisten tombol→notifikasi.
- Aksesibilitas: fokus keyboard terlihat, kontras AA, alt text, reduced-motion.
- Responsif mobile (sidebar admin → menu ringkas; tabel bisa scroll).
- **Pesan jujur:** ganti "100% Dapat Diverifikasi" → "Suara Terverifikasi"
  (tanpa angka mutlak). Tidak ada klaim absolut lain.

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE_M5.6.md dan AGENTS.md.

Konteks: ada mockup HTML statis di folder "Pace E-Voting/" (landing + dashboards
admin/voter) yang menjadi SUMBER KEBENARAN VISUAL. Aplikasi React di pace/client
adalah SUMBER KEBENARAN FUNGSIONAL.

Tugas: terapkan tampilan mockup ke aplikasi React, mempertahankan SELURUH logika
React/crypto/API apa adanya.

1. Pasang design tokens (§1) di :root client; impor font Plus Jakarta Sans &
   JetBrains Mono. Refactor agar warna/tipe diturunkan dari token (hapus hex
   hardcoded; hati-hati tabrakan spesifisitas CSS).
2. Replikasi pola komponen dari mockup (§2): nav, tombol gradien, Live Ballot Box,
   kartu pilar + chip algoritma mono, kartu ghost-number, sidebar admin, stat
   card, tabel + badge, audit timeline + chip mac, banner voter, kartu kandidat.
3. Bind DATA ASLI dari API (§3) — JANGAN hardcode angka/log mock. Admin overview,
   audit log, integrity status, kandidat semua dari endpoint nyata.
4. Terapkan bahasa desain yang sama ke halaman yang tidak ada di mockup (§4),
   termasuk PERBAIKI admin/login yang rusak.
5. Pertahankan state UX, aksesibilitas, responsif (§5). Ganti "100% Dapat
   Diverifikasi" -> "Suara Terverifikasi".

DILARANG mengubah: penanganan kunci privat (modal M4, purge Tally), crypto/ klien,
serialize.js, seal.js, endpoint/auth/tally backend, dan JANGAN tambah klaim
keamanan absolut. Ini murni lapisan tampilan.

Setelah selesai, ambil screenshot tiap halaman untuk review, dan jalankan
node --test untuk memastikan tidak ada logika yang rusak (harus tetap hijau).
```

---

## §Checklist verifikasi manusia

**Kesesuaian visual**
- [ ] Landing, voter dashboard, admin overview cocok dengan mockup.
- [ ] Live Ballot Box, chip algoritma, chip `mac:`, ghost number, sidebar admin
      tampil seperti referensi.
- [ ] Token dipusatkan; tidak ada hex hardcoded tercecer.

**Data asli**
- [ ] Angka admin (pemilih/suara) & audit log dari API, BUKAN hardcode.
- [ ] Status integritas dari `/audit-log/verify`.

**Konsistensi & perbaikan**
- [ ] admin/login kini kartu penuh bergaya panel KPU (tidak telanjang).
- [ ] Halaman lain (login/register/vote/receipt/tally) memakai bahasa desain sama.
- [ ] "100% Dapat Diverifikasi" sudah diganti; tidak ada klaim absolut.

**Keamanan tidak tersentuh (KRITIS)**
- [ ] `node --test` tetap hijau (semua test crypto/integrasi lulus).
- [ ] Penanganan kunci privat (modal M4, purge Tally) tidak berubah.
- [ ] crypto/, serialize.js, seal.js, endpoint backend tidak diubah.

**Kualitas**
- [ ] Fokus keyboard, kontras AA, alt text, reduced-motion, responsif mobile.
- [ ] Screenshot tiap halaman untuk BAB 6.
```
