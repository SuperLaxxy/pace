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
