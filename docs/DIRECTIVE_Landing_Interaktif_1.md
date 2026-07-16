# DIRECTIVE — Landing Page Interaktif + Sembunyikan Scrollbar + Live Ballot Box Halus

> Target file: `client/src/landing/Landing.jsx` dan `client/src/App.css`
> (+ sedikit di `client/src/index.css`). Ini murni lapisan TAMPILAN/animasi.
> JANGAN sentuh crypto/backend/logika. `node --test` harus tetap hijau.
> Hormati `prefers-reduced-motion` (blok media query-nya sudah ada di akhir App.css).

---

## 0. Konteks kode (sudah diverifikasi dari sumber)

- Komponen landing: `src/landing/Landing.jsx` (satu file, memakai class dari App.css).
- Style ballot box ada di `src/App.css`: `.glass-card`, `.visual-card`,
  `.ballot-stream`, `.ballot-item`, `.ballot-status`, keyframes `slideUp` &
  `slideInBallot`.
- Scrollbar: `body { overflow-x: hidden }` ada di `index.css` (baris ~70) dan
  App.css (baris ~36). Belum ada styling scrollbar kustom.
- Sudah ada blok `@media (prefers-reduced-motion: reduce)` di akhir App.css —
  pertahankan & pastikan animasi baru ikut dinonaktifkan di sana.

---

## 1. Sembunyikan scrollbar (tanpa mematikan fungsi scroll)

Tujuan: scrollbar tidak terlihat, TETAPI halaman tetap bisa di-scroll (mouse
wheel/touch/keyboard tetap jalan). Tambahkan ke `index.css`:

```css
/* Sembunyikan scrollbar tapi tetap bisa scroll */
html { scrollbar-width: none; -ms-overflow-style: none; }      /* Firefox & IE/Edge lama */
html::-webkit-scrollbar,
body::-webkit-scrollbar { width: 0; height: 0; display: none; } /* Chrome/Edge/Safari */
```

Catatan: JANGAN memakai `overflow: hidden` pada `html`/`body` untuk
menyembunyikan scrollbar — itu akan mematikan scroll sepenuhnya. Cukup teknik di
atas. `overflow-x: hidden` yang sudah ada boleh tetap.

---

## 2. Live Ballot Box: animasi mengalir & tidak kaku (perbaikan utama)

**Masalah saat ini:** ada DUA aturan animasi `.ballot-item` yang bertabrakan di
App.css — `.anim-slide-up` (keyframes `slideUp`) dan blok "Live Ballot Box
Fade-in" (keyframes `slideInBallot`). Keduanya hanya berjalan SEKALI lalu diam,
sehingga terasa kaku/statis.

**Solusi:** ubah Live Ballot Box menjadi **aliran (stream) yang hidup** — entri
baru "masuk" dari atas secara berkala dan entri lama bergeser turun, berulang
terus (loop), memberi kesan surat suara berdatangan secara real-time.

### 2a. Ubah menjadi komponen dinamis di `Landing.jsx`
Ganti tiga `.ballot-item` statis dengan daftar yang dikelola state, memakai
`useState` + `useEffect` + `setInterval`:

- Simpan array entri (mis. 4–5 item) di state. Tiap ~2.2 detik: buat satu entri
  baru di ATAS (dengan label waktu "Baru saja") lalu dorong yang lain ke bawah,
  dan buang yang terakhir agar jumlah tetap. Perbarui juga label waktu relatif
  ("12 detik lalu", dst.) agar terasa hidup.
- Semua entri tetap ILUSTRATIF/demo (data contoh, mis. tetap
  "AES-CBC + HMAC-SHA256" atau variasi hash acak pendek). JANGAN mengambil data
  suara nyata (kerahasiaan) — ini hanya visual di halaman publik.
- Beri tiap entri `key` unik agar React menganimasikan masuk/keluar dengan benar.
- Bersihkan interval di cleanup `useEffect` (hindari memory leak).
- WAJIB: jika `window.matchMedia('(prefers-reduced-motion: reduce)').matches`,
  JANGAN jalankan interval — tampilkan daftar statis saja.

Contoh kerangka (sesuaikan):
```jsx
import React, { useState, useEffect, useRef } from 'react';
// ...
const DEMO_ALGOS = ['AES-CBC + HMAC-SHA256'];
function randHash() {
  return Math.random().toString(16).slice(2, 6) + '…' + Math.random().toString(16).slice(2, 6);
}
const LiveBallotBox = () => {
  const [items, setItems] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({ id: Date.now() + i, algo: DEMO_ALGOS[0], born: Date.now() - i * 12000 }))
  );
  const reduce = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setItems(prev => [{ id: Date.now(), algo: DEMO_ALGOS[0], born: Date.now() }, ...prev].slice(0, 4));
    }, 2200);
    return () => clearInterval(t);
  }, [reduce]);
  const rel = (born) => {
    const s = Math.floor((Date.now() - born) / 1000);
    return s < 2 ? 'Baru saja (Demo)' : `${s} detik lalu (Demo)`;
  };
  return (
    <div className="ballot-stream">
      {items.map(it => (
        <div className="ballot-item" key={it.id}>
          <div className="ballot-icon">🔒</div>
          <div className="ballot-details">
            <div className="ballot-id">{it.algo}</div>
            <div className="ballot-time">{rel(it.born)}</div>
          </div>
          <div className="ballot-status">Terenkripsi</div>
        </div>
      ))}
    </div>
  );
};
```
Lalu ganti blok `.ballot-stream` statis di JSX dengan `<LiveBallotBox />`.

### 2b. Perbaiki CSS animasi (App.css)
- HAPUS duplikasi: satukan menjadi SATU keyframe masuk yang halus. Hapus/rapikan
  blok "Live Ballot Box Fade-in" yang menimpa `.ballot-item`.
- Animasi masuk untuk entri teratas + transisi geser yang halus (bukan patah):

```css
.ballot-item {
  animation: ballotIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: transform 0.35s ease, background 0.25s ease;
  will-change: transform, opacity;
}
.ballot-item:hover { transform: translateX(6px); background: rgba(255,255,255,0.05); }

@keyframes ballotIn {
  from { opacity: 0; transform: translateY(-14px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* titik "hijau" pada header kartu berdenyut halus agar terasa "live" */
.dots span:nth-child(3) { animation: pulseLive 1.8s ease-in-out infinite; }
@keyframes pulseLive {
  0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
  50%     { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
}
```
- Pastikan `@keyframes slideUp`/`slideInBallot` lama yang tidak dipakai lagi
  dibersihkan agar tidak bentrok.

---

## 3. Interaktivitas & animasi halaman (tasteful)

Tambahkan animasi yang meningkatkan kesan hidup tanpa berlebihan:

- **Reveal saat scroll:** section (features, flow, cta) muncul dengan fade-up
  halus ketika masuk viewport. Implementasikan dengan `IntersectionObserver`
  (bukan library), tambahkan class `.reveal` → `.reveal.is-visible`.
  ```css
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
  .reveal.is-visible { opacity: 1; transform: translateY(0); }
  ```
- **Hover kartu** (`.feature-card`, `.step-card`): angkat halus
  `translateY(-6px)` + shadow lebih dalam, transisi ~200ms.
- **Tombol gradien** (`.btn-primary`): hover sedikit lebih terang + glow lembut;
  `:active` scale 0.98; fokus keyboard ring terlihat.
- **Hero glow** (`.hero-bg-glow` / `.visual-glow`): animasikan pelan (drift/pulse
  sangat lambat, mis. 8–12s) agar latar terasa hidup, bukan diam.
- **Angka statistik hero** (opsional): animasi hitung-naik untuk "0 Suara Ganda".
- Semua transisi ≤ ~250ms untuk hover; animasi ambient lambat & halus.

---

## 4. Aturan keras

- HANYA ubah `Landing.jsx`, `App.css`, `index.css` (bagian scrollbar). JANGAN
  sentuh crypto/, voter/, admin/, server/, atau logika apa pun.
- Live Ballot Box tetap **data ilustratif** (jangan tarik suara nyata).
- Pertahankan & lengkapi blok `@media (prefers-reduced-motion: reduce)` agar
  SEMUA animasi baru (stream ballot, reveal, glow, pulse) dinonaktifkan untuk
  pengguna yang memilih reduce-motion.
- Aksesibilitas: fokus keyboard terlihat, kontras tetap AA.
- `node --test` tetap hijau (tidak menyentuh test).

---

## §Directive (tempel ke Antigravity)

```
Perbaiki HANYA landing page (client/src/landing/Landing.jsx, client/src/App.css,
dan bagian scrollbar di client/src/index.css). JANGAN sentuh crypto/, voter/,
admin/, server/, atau logika apa pun. node --test harus tetap hijau.

1. SEMBUNYIKAN SCROLLBAR tanpa mematikan scroll: di index.css tambahkan
   scrollbar-width:none; -ms-overflow-style:none; dan ::-webkit-scrollbar{display:none}
   pada html/body. JANGAN pakai overflow:hidden (itu mematikan scroll).

2. LIVE BALLOT BOX jadi aliran hidup & halus: ubah tiga .ballot-item statis di
   Landing.jsx menjadi komponen dinamis (useState+useEffect+setInterval) yang
   memunculkan entri baru dari atas tiap ~2.2 detik dan menggeser yang lama,
   dengan label waktu relatif. Data tetap ILUSTRATIF/demo (jangan tarik suara
   nyata). Bersihkan interval saat unmount. Jika prefers-reduced-motion aktif,
   tampilkan statis (jangan jalankan interval).
   Di App.css: HAPUS duplikasi animasi .ballot-item (slideUp vs slideInBallot),
   ganti dengan satu keyframe masuk halus (ballotIn, cubic-bezier) + transisi
   geser; tambah denyut halus pada titik hijau header (pulseLive).

3. INTERAKTIVITAS HALAMAN (tasteful, jangan berlebihan): reveal fade-up section
   saat scroll via IntersectionObserver (.reveal -> .reveal.is-visible); hover
   lift pada .feature-card & .step-card; hover/active/focus pada .btn-primary;
   animasikan hero glow sangat lambat (8-12s).

4. Pastikan blok @media (prefers-reduced-motion: reduce) di akhir App.css
   menonaktifkan SEMUA animasi baru. Jaga kontras AA & fokus keyboard.

Setelah selesai: pastikan halaman tetap bisa di-scroll (scrollbar tak terlihat),
Live Ballot Box mengalir mulus, section muncul saat scroll, dan node --test hijau.
Ambil screenshot landing page.
```

---

## §Checklist verifikasi

- [ ] Scrollbar tidak terlihat, TAPI halaman masih bisa di-scroll (wheel/keyboard).
- [ ] Live Ballot Box: entri baru berdatangan mulus & berulang (tidak diam/kaku).
- [ ] Titik hijau header berdenyut halus (kesan "live").
- [ ] Section muncul dengan fade-up saat di-scroll ke viewport.
- [ ] Hover kartu & tombol terasa hidup; fokus keyboard terlihat.
- [ ] prefers-reduced-motion: semua animasi mati (uji via setelan OS/emulasi DevTools).
- [ ] Interval dibersihkan (tidak ada warning/memory leak di console).
- [ ] Hanya Landing.jsx/App.css/index.css yang berubah; node --test tetap hijau.
```

---

# TAMBAHAN — Angka Agregat "Nyata" yang Aman di Landing

> Tujuan: memberi sentuhan data nyata pada landing TANPA melanggar kerahasiaan.
> Prinsip: tampilkan HANYA angka agregat yang aman ditampilkan kapan saja —
> BUKAN jumlah suara pemilu yang sedang berjalan (itu bisa memengaruhi pemilih /
> efek bandwagon), dan BUKAN peristiwa individual (waktu/identitas → korelasi).

## T.1 Apa yang boleh & tidak boleh ditampilkan

**BOLEH (aman kapan saja):**
- Jumlah pemilih terdaftar (total baris `voters`).
- Jumlah pemilu yang pernah diselenggarakan (total baris `elections`).
- Jumlah pemilu yang sudah selesai/`closed` (opsional).

**JANGAN:**
- Jumlah suara pada pemilu yang berstatus `open` (real-time) → risiko bandwagon.
- Timestamp/urutan/identitas suara individual → risiko korelasi (ballot secrecy).
- Data apa pun yang bisa memetakan siapa-memilih-apa.

> Catatan: jumlah suara total BOLEH ditampilkan hanya untuk pemilu yang sudah
> `closed` (hasil sudah resmi). Jika ragu, cukup tampilkan pemilih terdaftar &
> jumlah pemilu — keduanya paling aman.

## T.2 Backend: endpoint publik read-only (server)

Tambahkan endpoint PUBLIK (tanpa auth) yang HANYA mengembalikan angka agregat.
Server sudah me-mount `votingRoutes` di `/api` (lihat `index.js`:
`app.use('/api', votingRoutes)`), jadi tambahkan route ini di
`server/routes/voting.js`:

```js
// GET /api/stats/public — angka agregat AMAN untuk landing (tanpa auth).
// TIDAK mengembalikan suara real-time, timestamp, atau identitas apa pun.
router.get('/stats/public', (req, res) => {
  try {
    const voters = db.prepare('SELECT COUNT(*) AS n FROM voters').get().n;
    const elections = db.prepare('SELECT COUNT(*) AS n FROM elections').get().n;
    const closed = db.prepare("SELECT COUNT(*) AS n FROM elections WHERE status = 'closed'").get().n;
    // Suara HANYA dihitung dari pemilu yang SUDAH closed (hasil resmi), agar tidak
    // membocorkan progres pemilu berjalan. Jika ingin lebih aman, hilangkan baris ini.
    const votesClosed = db.prepare(`
      SELECT COUNT(*) AS n FROM ballots b
      JOIN elections e ON e.id = b.election_id
      WHERE e.status = 'closed'
    `).get().n;
    res.json({ voters, elections, closedElections: closed, votesClosed });
  } catch (e) {
    res.status(500).json({ error: 'stats unavailable' });
  }
});
```

**Aturan keras endpoint ini:**
- READ-ONLY, hanya `COUNT(*)`. TIDAK mengembalikan baris/kolom detail.
- TIDAK ada data per-suara, per-pemilih, timestamp, atau nonce.
- Tidak menghitung suara pemilu `open`. (Kolom `votesClosed` opsional; boleh
  dihapus jika tidak ingin menampilkan jumlah suara sama sekali.)
- JANGAN mengubah endpoint/logika lain di `voting.js`.

## T.3 Frontend: tampilkan di hero stats (Landing.jsx)

Di `Landing.jsx`, ambil angka ini saat komponen dimuat dan tampilkan pada baris
`.hero-stats` (atau strip statistik terpisah). Contoh:

```jsx
const [stats, setStats] = useState(null);
useEffect(() => {
  let alive = true;
  fetch('/api/stats/public')
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (alive) setStats(d); })
    .catch(() => {});           // gagal diam-diam → fallback teks statis
  return () => { alive = false; };
}, []);
```

Pemetaan tampilan (ganti/isi angka pada `.stat-value`):
- "End-to-End / Enkripsi Suara" → biarkan (deskriptif).
- "Terverifikasi / Integritas Suara" → biarkan (deskriptif).
- Ganti/isi salah satu stat dengan **angka nyata**, mis.:
  - `{stats?.voters ?? '—'}` → label "Pemilih Terdaftar".
  - `{stats?.elections ?? '—'}` → label "Pemilu Diselenggarakan".
- Jika `stats` null (endpoint gagal), tampilkan fallback statis (mis. "—" atau
  teks lama) agar landing tidak rusak.
- (Opsional) animasi hitung-naik (count-up) untuk angka ini, dinonaktifkan saat
  prefers-reduced-motion.

**Beri konteks jujur:** jika menampilkan `votesClosed`, beri label yang jelas
seperti "Suara Tercatat (Pemilu Selesai)" — bukan sekadar "Suara Masuk" — agar
tidak menyiratkan progres pemilu berjalan.

## T.4 Aturan keras (tambahan)

- Endpoint `GET /api/stats/public` HANYA angka agregat; tidak bocorkan detail.
- JANGAN tampilkan jumlah suara pemilu `open`.
- Live Ballot Box TETAP ilustratif/demo (angka agregat ini TERPISAH & nyata).
- JANGAN sentuh crypto/, logika vote/tally, atau skema DB. node --test hijau.

## §Tambahan untuk blok §Directive (tempel ke Antigravity)

```
TAMBAHAN: tampilkan angka agregat NYATA yang aman di landing.
1. Backend: tambah GET /api/stats/public di server/routes/voting.js (sudah
   ter-mount di /api). READ-ONLY, hanya COUNT(*): jumlah voters, jumlah elections,
   jumlah closedElections, dan (opsional) votesClosed = jumlah suara HANYA dari
   pemilu berstatus 'closed'. TIDAK mengembalikan timestamp/identitas/detail
   per-suara. TIDAK menghitung suara pemilu 'open'. Jangan ubah endpoint lain.
2. Frontend: di Landing.jsx, fetch('/api/stats/public') saat mount, tampilkan
   pada hero-stats (mis. Pemilih Terdaftar & Pemilu Diselenggarakan). Fallback
   statis bila gagal. Jika menampilkan jumlah suara, beri label "Suara Tercatat
   (Pemilu Selesai)". Opsional count-up, matikan saat prefers-reduced-motion.
JANGAN tampilkan jumlah suara pemilu 'open'. Live Ballot Box tetap ilustratif.
JANGAN sentuh crypto/logika/skema. node --test tetap hijau.
```

## §Checklist verifikasi (tambahan)

- [ ] GET /api/stats/public mengembalikan hanya angka agregat (cek: tak ada detail per-suara).
- [ ] Landing menampilkan angka nyata (pemilih terdaftar / pemilu) dari endpoint.
- [ ] TIDAK ada jumlah suara pemilu 'open' yang bocor ke publik.
- [ ] Endpoint gagal → landing tetap tampil (fallback), tidak error.
- [ ] Live Ballot Box tetap ilustratif & berlabel Demo.
- [ ] node --test tetap hijau.
