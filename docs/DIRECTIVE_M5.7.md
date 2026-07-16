# DIRECTIVE M5.7 — Perbaikan Layout (Centering & Skala) + Polish Interaktif

> Fokus: (1) perbaiki konten yang ter-dorong ke kiri & terasa kecil, (2) tambah
> interaktivitas/polish yang tasteful, (3) SELIDIKI regresi fungsional
> "Voter: Unknown". Tetap TANPA menyentuh logika crypto/backend.

---

## 1. Bug layout: konten nempel kiri & terlalu kecil (PRIORITAS)

**Gejala:** semua halaman ter-dorong ke kiri, ruang kosong besar di kanan, UI terasa kecil.

**Akar penyebab paling mungkin:** sisa CSS default Vite di `index.css` bentrok
dengan layout baru:
```css
/* default Vite yang harus DIBERSIHKAN/diperbaiki */
body  { display: flex; place-items: center; }
#root { max-width: 1280px; margin: 0 auto; text-align: center; }
```
Atau: container konten punya `max-width` tanpa `margin: 0 auto`, atau parent
flex/grid memakai `align-items/justify-content: flex-start`.

**Perbaikan yang diminta:**
- Bersihkan boilerplate Vite yang melawan layout: hapus `display:flex;
  place-items:center` pada `body`, dan `text-align:center` + `max-width` sempit
  pada `#root`. Set `body, #root { width:100%; margin:0; }`.
- Buat utilitas container konsisten dan **terpusat**:
  ```css
  .container { width:100%; max-width:1200px; margin:0 auto; padding:0 24px; }
  ```
  Section punya lebar penuh (latar full-bleed), konten di dalam pakai `.container`.
- **Halaman auth (login/register/admin):** kartu harus terpusat horizontal & vertikal:
  ```css
  .auth-layout { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .auth-card   { width:100%; max-width:420px; }
  ```
- **Skala:** pastikan container ~1200px (bukan ~900px), naikkan skala tipe hero
  & jarak antar-section agar tidak terasa kecil/sempit. Responsif: di mobile
  container full-width dengan padding.

---

## 2. Polish & interaktivitas (tasteful — jangan berlebihan)

Tambahkan, tapi hemat (animasi berlebihan justru bikin terasa "AI"):
- **Hover kartu** (pilar, kandidat, stat): `transform: translateY(-4px)` +
  shadow lebih dalam, transisi `~180ms ease`.
- **Tombol gradien:** hover sedikit lebih terang + glow halus; `:active` scale
  `0.98`; fokus keyboard ring jelas.
- **Live Ballot Box:** entri baru muncul dengan fade/slide-in halus (tetap
  ilustratif/demo).
- **Scroll reveal** section (fade-up halus saat masuk viewport) — opsional.
- **State memilih:** tombol "Berikan Suara" → "Menyegel…" dengan spinner saat proses.
- **Kartu kandidat:** highlight saat hover + indikasi terpilih.
- **WAJIB:** hormati `prefers-reduced-motion` (matikan animasi), fokus terlihat,
  kontras AA. Polish tidak boleh mengorbankan aksesibilitas.

---

## 3. ⚠️ Regresi fungsional yang HARUS diselidiki (bukan kosmetik)

Header menampilkan **"Voter: Unknown"** (gambar 7-9), padahal seharusnya
identitas/NIM pemilih yang login. Ini menandakan identitas pemilih tidak
tersimpan/terbaca setelah restyle — dan `Vote.jsx` mengambil `signerPublicKeyId`
dari `localStorage.getItem('voter_id')`. Jika itu `null`, pengiriman suara gagal
(terlihat di gambar 9: "Gagal mengambil kunci publik…").

**Minta agent:**
1. Pastikan saat login, identitas pemilih (id/NIM + voter_id untuk
   signerPublicKeyId) BENAR disimpan & dibaca — perbaiki kalau restyle
   memutuskannya. JANGAN ubah logika crypto, hanya perbaiki binding identitas
   yang hilang.
2. Konfirmasi alur memilih lengkap berjalan end-to-end di browser (login →
   setup kunci → pilih → password → suara terkirim 201 → resi).

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE_M5.7.md. Ini perbaikan LAPISAN TAMPILAN + satu regresi binding
identitas. JANGAN ubah crypto/, serialize.js, seal.js, endpoint backend, atau
logika modal kunci/tally. node --test harus tetap hijau.

1. PERBAIKI bug centering/skala (§1): bersihkan sisa CSS default Vite (body
   display:flex/place-items:center; #root max-width sempit + text-align:center),
   buat .container terpusat (max-width ~1200px, margin:0 auto), dan .auth-layout
   yang memusatkan kartu auth horizontal+vertikal. Naikkan skala agar tidak kecil.
   Pastikan semua halaman (landing, auth, voter, admin, vote, receipt) terpusat
   & responsif.

2. TAMBAH polish interaktif tasteful (§2): hover lift kartu, hover/active/focus
   tombol gradien + glow, fade-in Live Ballot Box, state "Menyegel…" saat
   memilih. WAJIB hormati prefers-reduced-motion, fokus terlihat, kontras AA.
   Jangan berlebihan.

3. SELIDIKI & perbaiki "Voter: Unknown" (§3): pastikan identitas pemilih (dan
   voter_id untuk signerPublicKeyId) tersimpan saat login & terbaca di header
   dan Vote.jsx. Ini binding identitas, BUKAN logika crypto — jangan sentuh
   crypto. Konfirmasi alur memilih lengkap berhasil di browser.

Setelah selesai: jalankan node --test (harus hijau), ambil screenshot tiap
halaman, dan uji alur memilih + alur admin lengkap di browser.
```

---

## §Checklist verifikasi manusia

**Layout**
- [ ] Semua halaman terpusat; tidak ada lagi ruang kosong besar di kanan.
- [ ] Kartu auth (login/register/admin) terpusat horizontal & vertikal.
- [ ] UI terasa proporsional (tidak kecil/sempit); rapi di mobile.

**Polish**
- [ ] Hover kartu/tombol terasa hidup; fokus keyboard terlihat; reduced-motion dihormati.

**Fungsional (KRITIS — node --test tidak menangkap ini)**
- [ ] Header pemilih menampilkan identitas asli (bukan "Voter: Unknown").
- [ ] Alur memilih BERHASIL end-to-end di browser: suara terkirim (201) + resi muncul.
- [ ] Alur admin lengkap masih jalan (buat pemilu → modal kunci → aktivasi →
      tutup → tally → hasil).
- [ ] node --test tetap hijau.
```
