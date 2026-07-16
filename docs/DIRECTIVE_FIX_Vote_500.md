# DIRECTIVE FIX — "Internal Server Error" Saat Mengirim Suara

> Gejala: suara berhasil dienkripsi & ditandatangani di browser, dikirim ke
> server, lalu server membalas 500 "Internal server error".
> Petunjuk kuat: konfirmasi menampilkan "Kandidat 43" & URL /vote/5/43, padahal
> kandidat yang valid hanya No. 1 (Alice) & No. 2 (Gatot & Rusdi). ID kandidat
> yang dikirim KELIRU. Perbaiki tanpa menyentuh logika crypto. node --test hijau.

---

## 1. Diagnosis

- Error 500 berarti ada exception TAK TERTANGANI di server, kemungkinan di dalam
  transaksi `/vote` (`server/routes/voting.js`). Pesan ASLI ada di TERMINAL server,
  bukan di browser — wajib dibaca.
- Tersangka utama: **ID kandidat yang dikirim salah ("43")**. Dashboard
  menampilkan tombol "Pilih Kandidat 1/2" (itu `ballot_number`), tetapi yang
  dikirim ke route vote tampaknya bukan `id` kandidat yang benar — terjadi
  pencampuran antara `candidate.id` dan `candidate.ballot_number`.
- Akibatnya plaintext suara berisi ID kandidat yang tidak ada → bisa memicu
  pelanggaran constraint / error saat insert atau saat proses lain → 500.

---

## 2. Langkah WAJIB: tampilkan error server yang sebenarnya

Sebelum menebak, baca pesan asli:
1. Lihat TERMINAL tempat server berjalan saat menekan "Ya, Enkripsi & Kirim Suara".
   Akan ada stack trace `console.error`. Catat baris error & pesan persisnya.
2. Ini menentukan apakah 500 berasal dari: ID kandidat tak valid, masalah format
   data, constraint DB, atau hal lain. Perbaiki berdasarkan pesan ASLI, bukan tebakan.

---

## 3. Perbaikan ID kandidat (tersangka utama)

Periksa alur pengiriman ID kandidat dari Dashboard pemilih → Vote.jsx → server:
- Dashboard: tombol pilih harus mengirim **`candidate.id`** (ID asli DB) sebagai
  identitas kandidat ke route vote, BUKAN `ballot_number`. Tapi yang DITAMPILKAN
  ke user tetap `ballot_number` ("Pilih Kandidat 1"). Pastikan keduanya tidak tertukar.
- Vote.jsx: nilai yang dienkripsi sebagai isi suara harus konsisten dengan apa
  yang diharapkan saat TALLY. Saat tally (`admin.js`), hasil dihitung dengan
  `results[candidateId]` di mana candidateId = ID kandidat dari tabel candidates.
  Jadi yang dienkripsi sebagai suara HARUS `candidate.id`, dan tally mencocokkan
  ke `candidates.id`. Pastikan rantai ini konsisten: yang dipilih = id, yang
  dienkripsi = id, yang dihitung = id.
- Validasi: sebelum/saat memproses, jika ID kandidat tidak ada di pemilu tsb,
  server harus membalas error 400 yang JELAS ("Kandidat tidak valid"), BUKAN 500.

---

## 4. Pakai data uji yang bersih

Data kandidat saat ini berantakan (visi kosong, ID melonjak ke 42/43 karena
banyak test). Untuk demo & pengujian yang meyakinkan:
- Buat SATU pemilu baru yang bersih dengan 2-3 kandidat berdata lengkap
  (nomor urut 1..n, nama, visi terisi).
- Uji memilih pada pemilu bersih itu agar ID kandidat wajar & cocok.

---

## 5. Aturan keras

- JANGAN ubah: `crypto-engine/` (ecdsa, serialize, seal, envelope, audit-chain),
  logika verifikasi tanda tangan, transaksi atomik anti-replay/anti-double-vote,
  invarian `ballots` tanpa `voter_id`, skema DB.
- Ini perbaikan KONSISTENSI ID kandidat + penanganan error, BUKAN kriptografi.
- Tambahkan penanganan agar input tak valid menghasilkan 400 yang jelas, bukan 500.
- `node --test` harus tetap hijau (laporkan jumlah test; jangan menyusut).

---

## §Directive (tempel ke Antigravity)

```
Bug: kirim suara membalas 500 "Internal server error". Konfirmasi menampilkan
"Kandidat 43" & URL /vote/5/43, padahal kandidat valid hanya No.1 & No.2 — ID
kandidat yang dikirim KELIRU (tampaknya tertukar antara candidate.id dan
ballot_number).

1. WAJIB: baca pesan error ASLI di terminal server saat vote dikirim (stack trace
   console.error di voting.js). Tentukan akar 500 dari pesan itu, bukan tebakan.

2. Perbaiki konsistensi ID kandidat sepanjang rantai: Dashboard mengirim
   candidate.id (bukan ballot_number) ke route vote; yang ditampilkan ke user
   tetap ballot_number. Yang dienkripsi sebagai isi suara = candidate.id. Pastikan
   ini cocok dengan tally di admin.js yang menghitung results[candidate.id].

3. Tambahkan validasi: jika ID kandidat tidak ada di pemilu tsb, server membalas
   400 "Kandidat tidak valid" yang jelas, BUKAN 500.

4. Sarankan/siapkan satu pemilu uji bersih dengan 2-3 kandidat berdata lengkap.

DILARANG mengubah crypto-engine/, verifikasi tanda tangan, transaksi atomik,
invarian ballots tanpa voter_id, skema DB. node --test harus tetap hijau.

Verifikasi: pada pemilu bersih, login pemilih aktif -> pilih kandidat -> password
kunci -> suara terkirim 201 -> resi muncul. Cek admin: "Suara Masuk" +1 & audit
log ada entri VOTE_CAST. Jalankan node --test (laporkan jumlahnya).
```

---

## §Checklist verifikasi

- [ ] Pesan error asli di terminal server sudah dibaca & ditangani.
- [ ] ID kandidat konsisten: dipilih = id, dienkripsi = id, ditally = id.
- [ ] Input ID kandidat tak valid -> 400 jelas, bukan 500.
- [ ] Pada pemilu bersih: suara terkirim 201 + resi muncul.
- [ ] Admin: "Suara Masuk" bertambah, Live Audit Log ada VOTE_CAST.
- [ ] Verifikasi integritas audit log tetap hijau.
- [ ] node --test tetap hijau (jumlah tidak menyusut).
```
