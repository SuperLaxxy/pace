# DIRECTIVE M5 — Landing Page PACE

> Pola sama: tempel **§Directive** ke Antigravity, review, verifikasi pakai
> **§Checklist**. Ini milestone paling ringan (tanpa logika keamanan), TAPI ada
> satu aturan penting soal kejujuran pesan — lihat §Aturan Pesan.

---

## Keputusan & lingkup

- Landing page dibuat sebagai **route `/` di dalam React client** yang sudah ada
  (`client/src/landing/`), berbagi sistem desain dengan aplikasi pemilih/admin.
- Halaman publik, **tanpa autentikasi**. Tujuan: menjelaskan apa itu PACE,
  membangun kepercayaan secara jujur, dan mengarahkan pengguna ke login/daftar.
- Bahasa Indonesia, responsif (mobile-first), aksesibel.

---

## §Aturan Pesan (PENTING — khusus proyek kriptografi)

Landing page adalah tempat paling mudah untuk **melebih-lebihkan klaim keamanan**,
dan itu justru berbahaya untuk nilai Anda. Sepanjang proyek kita sudah jujur soal
keterbatasan (pseudonimitas, risiko XSS pada localStorage, kepercayaan admin
tunggal). Landing page TIDAK BOLEH mengkhianati kejujuran itu.

**DILARANG** klaim absolut seperti:
- "100% aman", "tidak bisa diretas", "unhackable"
- "sepenuhnya anonim", "kerahasiaan mutlak"
- "tidak mungkin dimanipulasi"

**GUNAKAN** bahasa akurat yang menjelaskan MEKANISME, bukan janji mutlak:
- "Suara Anda dienkripsi sehingga tidak terbaca oleh server maupun panitia
  sebelum penghitungan resmi."
- "Setiap suara disegel secara kriptografis — perubahan apa pun akan terdeteksi."
- "Hanya KPU yang memegang kunci penghitungan."

Alasannya: kalau Kelompok 6 (penyerang) atau dosen menemukan klaim absolut yang
tidak bisa Anda buktikan, itu merusak kredibilitas seluruh proyek. Pesan yang
akurat justru lebih meyakinkan.

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE_M5.md, PRD_PACE_v2.md, dan AGENTS.md. Ikuti skill frontend-design
untuk styling; konsisten dengan tema PACE yang sudah dipakai aplikasi pemilih/admin.

Buat landing page sebagai route '/' di client/src/landing/ (komponen Landing.jsx
+ sub-komponen sesuai kebutuhan). Wire route '/' di App.jsx. Semua teks Bahasa
Indonesia. WAJIB patuhi §Aturan Pesan di DIRECTIVE_M5 (tanpa klaim absolut).

Bagian halaman (urut):
1. HERO: nama "PACE — Papua Cyber Election", tagline singkat, dua tombol:
   "Masuk untuk Memilih" (-> /login pemilih) dan "Login KPU" (-> /admin/login).
2. JAMINAN: empat kartu ringkas (bahasa awam) — Kerahasiaan, Integritas,
   Terverifikasi, Anti-pemalsuan.
3. "BAGAIMANA SUARA ANDA DILINDUNGI": empat poin yang menjelaskan secara AWAM
   mekanisme di balik layar (enkripsi suara / segel integritas / kunci penghitungan
   hanya di KPU / tanda tangan pemilih). Jelaskan manfaatnya, bukan jargon teknis.
4. "CARA MEMILIH": 3-4 langkah (Masuk & siapkan kunci -> Pilih kandidat ->
   Suara disegel & dikirim -> Terima resi).
5. TENTANG: paragraf singkat tentang KPU Mahasiswa & tujuan PACE.
6. FAQ (3-5 pertanyaan), dijawab JUJUR. Contoh: "Apakah pilihan saya rahasia?",
   "Bisakah saya memilih dua kali?", "Bagaimana jika server diretas?".
   Jawaban harus akurat & sesuai keterbatasan yang sudah didokumentasikan; jangan
   menjanjikan kemutlakan.
7. FOOTER: kredit "Proyek mata kuliah Kriptografi — Kelompok 5". Sebutkan ini
   PROYEK AKADEMIK (jangan mengesankan layanan pemerintah resmi yang sudah live).

Aturan: halaman publik, TANPA memuat secret/kunci/token apa pun. Tambahkan alt
text pada gambar, kontras warna memadai, dan navigasi keyboard. Responsif mobile.
Jangan ubah logika backend atau komponen aplikasi yang sudah ada.
```

---

## §Checklist verifikasi manusia

- [ ] Landing tampil di `/`; tombol mengarah benar ke login pemilih & login KPU.
- [ ] **Tidak ada klaim absolut** ("100% aman", "anonim mutlak", dll) — baca semua teks.
- [ ] FAQ menjawab jujur, sesuai keterbatasan yang sudah didokumentasikan.
- [ ] Footer menyatakan ini proyek akademik (Kelompok 5, Kriptografi).
- [ ] Tidak ada secret/kunci/token di source maupun Network tab.
- [ ] Responsif di layar mobile; kontras & navigasi keyboard memadai.
- [ ] Komponen aplikasi pemilih/admin yang lama tidak rusak (route lain tetap jalan).
- [ ] Screenshot landing page untuk BAB 6.

---

## §Catatan (untuk laporan)

Landing page memperkuat narasi proyek: ia menjelaskan nilai kriptografi PACE ke
audiens awam **tanpa melebih-lebihkan**. Konsistensi antara klaim di landing page
dan keterbatasan jujur di BAB 7 adalah bukti kematangan rekayasa — pastikan
keduanya selaras.

Opsional (jika ada waktu): identitas visual kedaerahan Papua yang dipakai secara
santun/representatif bisa memperkuat tema, tapi hindari stereotip; serahkan pada
selera desain tim.
