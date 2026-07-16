# DIRECTIVE FIX KRITIS — Modal Unduh Kunci Privat Hilang Saat Buat Pemilu

> MASALAH KRITIS KEAMANAN: server mengirim kunci privat RSA SATU KALI saat pemilu
> dibuat (`privateKeyPem` di respons), tapi komponen CreateElection TIDAK
> menampilkannya untuk diunduh -> kunci HILANG permanen -> pemilu TIDAK BISA
> di-tally. Ini "UX Kritis M4" yang harus dipulihkan.
> JANGAN ubah backend/crypto. node --test tetap hijau.

---

## 1. Akar masalah

`POST /api/admin/elections` mengembalikan `privateKeyPem` HANYA sekali dan server
TIDAK menyimpannya (benar secara keamanan). Tapi CreateElection.jsx mengabaikan
`privateKeyPem` dari respons -> kunci tidak pernah sampai ke admin -> hilang.
Tanpa kunci ini, tally (`/elections/:id/tally`) mustahil.

---

## 2. Yang harus diperbaiki (CreateElection.jsx)

Setelah `POST /api/admin/elections` berhasil dan menerima `privateKeyPem`:

1. **Tampilkan MODAL BLOCKING** (tidak bisa ditutup dengan klik luar / Esc) yang:
   - Menampilkan peringatan jelas: "Kunci Privat KPU untuk pemilu ini. Ini
     SATU-SATUNYA salinan. Server TIDAK menyimpannya. Tanpa kunci ini, suara
     TIDAK BISA dihitung. Simpan baik-baik."
   - Menampilkan isi `privateKeyPem` (boleh dalam textarea read-only).
   - Tombol **"Unduh Kunci (.pem)"** yang men-download file (lihat §3).
   - (Opsional) tombol "Salin".
   - **Checkbox wajib**: "Saya sudah menyimpan kunci privat ini dengan aman."
   - Tombol "Selesai/Lanjutkan" **DISABLED** sampai checkbox dicentang
     (idealnya juga sampai tombol unduh ditekan).
2. Hanya setelah konfirmasi, modal ditutup & redirect ke detail/kelola pemilu.
3. JANGAN simpan privateKeyPem ke localStorage/state global/DB. Hanya di state
   komponen selama modal terbuka, lalu DIBUANG saat modal ditutup.

---

## 3. Cara unduh file .pem di browser (referensi implementasi)

```jsx
function downloadPem(pem, filename) {
  const blob = new Blob([pem], { type: 'application/x-pem-file' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename; // mis. `kunci-privat-${electionTitle}.pem`
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```
Nama file sebaiknya menyertakan judul/ID pemilu agar tidak tertukar antar-pemilu.

---

## 4. Cegah double-submit (sekalian)

Disable tombol "Buat Pemilu" saat loading agar tidak membuat pemilu ganda
(masalah duplikat sebelumnya). Aktifkan lagi hanya setelah respons + modal selesai.

---

## 5. Aturan keras

- JANGAN ubah endpoint `/elections` atau cara generate kunci RSA di backend.
- Kunci privat hanya di memori selama modal; tidak disimpan/di-log.
- node --test tetap hijau (laporkan jumlahnya).

---

## §Directive (tempel ke Antigravity)

```
MASALAH KRITIS: saat buat pemilu, server mengirim privateKeyPem (kunci privat RSA
KPU) satu kali, tapi CreateElection.jsx tidak menampilkannya -> kunci hilang ->
pemilu tidak bisa di-tally. Pulihkan modal unduh kunci (UX Kritis M4).

Perbaiki CreateElection.jsx:
1. Setelah POST /api/admin/elections berhasil & menerima privateKeyPem, tampilkan
   MODAL BLOCKING (tak bisa ditutup via klik-luar/Esc) berisi: peringatan bahwa
   ini satu-satunya salinan & server tidak menyimpannya; isi privateKeyPem dalam
   textarea read-only; tombol "Unduh Kunci (.pem)" yang men-download file via Blob
   (nama file menyertakan judul pemilu); checkbox wajib "Saya sudah menyimpan kunci
   ini"; tombol Lanjutkan DISABLED sampai checkbox dicentang.
2. Setelah konfirmasi, tutup modal, BUANG privateKeyPem dari state, redirect ke
   detail pemilu.
3. JANGAN simpan privateKeyPem ke localStorage/state global/DB/console.
4. Disable tombol "Buat Pemilu" saat loading (cegah pemilu duplikat).

JANGAN ubah endpoint backend atau generate kunci RSA. node --test tetap hijau
(laporkan jumlah). Verifikasi: buat pemilu baru -> modal kunci muncul -> unduh
.pem berhasil -> tanpa centang checkbox tidak bisa lanjut -> setelah lanjut,
kunci tidak tersimpan di localStorage.
```

---

## 6. Tindakan manual Anda (untuk pemilu yang kuncinya sudah hilang)

Pemilu "Pemilihan Ketua HMTI 2026" (ELC-2026-01) yang baru dibuat **kuncinya
sudah hilang** dan tidak bisa di-tally. Setelah perbaikan di atas:
1. Hapus pemilu HMTI yang kuncinya hilang itu (lewat fitur hapus draft, ATAU
   karena DB Anda baru saja bersih, reset ulang lebih simpel — tapi reset berarti
   seed admin lagi).
2. Buat ULANG pemilu -> kali ini modal kunci muncul -> UNDUH & SIMPAN .pem-nya.
3. Lanjutkan run bersih (kandidat -> pemilih -> suara -> audit hijau -> tally).

---

## §Checklist verifikasi

- [ ] Buat pemilu baru -> modal kunci privat MUNCUL & blocking.
- [ ] Tombol "Unduh Kunci (.pem)" berhasil men-download file .pem.
- [ ] Tidak bisa lanjut tanpa mencentang checkbox konfirmasi.
- [ ] Setelah lanjut, privateKeyPem TIDAK ada di localStorage/console.
- [ ] Tombol "Buat Pemilu" disable saat loading (tidak ada pemilu duplikat).
- [ ] node --test tetap hijau.
```
