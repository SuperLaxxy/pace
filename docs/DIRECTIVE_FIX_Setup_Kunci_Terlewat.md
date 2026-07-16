# DIRECTIVE FIX — Halaman Setup Kunci Terlewat (Kata Sandi Kunci Keamanan)

> Gejala: setelah login, pemilih langsung ke dashboard/vote TANPA melewati halaman
> setup kunci, sehingga tidak pernah membuat "Kata Sandi Kunci Keamanan". Akibatnya
> saat memilih, tidak ada kunci privat yang cocok -> memilih gagal.
> Ini perbaikan ROUTING + SCOPING kunci di frontend. JANGAN ubah crypto/backend.
> node --test tetap hijau.

---

## 1. Akar masalah

Di `voter/Login.jsx`, setelah login berhasil:
```js
const hasKey = localStorage.getItem('pace_voter_private_key');
if (!hasKey) navigate('/setup-key'); else navigate('/dashboard');
```
Masalah: kunci disimpan dengan **satu nama global** `pace_voter_private_key`,
padahal `localStorage` milik BROWSER (bukan per-akun). Jadi:
- Kunci sisa dari pemilih LAIN membuat `hasKey` bernilai true untuk pemilih baru
  -> setup-key DILEWATI -> pemilih baru tak pernah membuat kata sandi kunci ->
  saat memilih, kunci tidak cocok -> gagal.

## 2. Perbaikan: SCOPE kunci per pemilih (per voter_id)

Ubah agar kunci privat disimpan & dibaca dengan nama key yang MENGANDUNG identitas
pemilih, sehingga tiap akun punya slot kunci sendiri dan tidak saling menimpa.

- Nama key: `pace_voter_private_key_<voter_id>` (bukan lagi global
  `pace_voter_private_key`).
- Semua tempat yang menyimpan/membaca kunci harus konsisten memakai pola ini:
  - `voter/Login.jsx` — cek keberadaan kunci untuk voter_id yang BARU login.
  - `voter/SetupKey.jsx` (atau komponen setup) — simpan kunci ke key ber-scope.
  - `voter/Vote.jsx` — baca kunci dari key ber-scope milik voter_id aktif.

### Perbaikan routing di Login.jsx
Setelah login sukses & menyimpan identitas (token, voter_id, voter_nim):
```js
const voterId = data.voter.id;
const hasKey = localStorage.getItem(`pace_voter_private_key_${voterId}`);
if (!hasKey) navigate('/setup-key'); else navigate('/dashboard');
```
Dengan begitu, pemilih baru (yang belum punya kunci ber-scope) SELALU diarahkan
ke setup-key, tanpa terpengaruh kunci milik akun lain.

## 3. Konsistensi token/identitas (sekalian pastikan)

Pastikan nama key localStorage konsisten di seluruh alur pemilih:
- `token` (JWT), `voter_id`, `voter_nim`, dan
  `pace_voter_private_key_<voter_id>`.
Login menyimpan; SetupKey/Dashboard/Vote membaca dengan nama yang SAMA.

## 4. Kebersihan saat logout (opsional tapi disarankan)

Saat logout, cukup hapus sesi (`token`, `voter_id`, `voter_nim`). Kunci privat
ber-scope boleh tetap tersimpan agar pemilih yang sama tak perlu setup ulang di
perangkatnya sendiri — TAPI untuk skenario uji multi-akun di satu browser,
sediakan cara bersih (atau dokumentasikan `localStorage.clear()`).

## 5. Aturan keras

- JANGAN ubah: crypto-engine, cara generate/enkripsi kunci (PBKDF2+AES-GCM),
  endpoint backend, skema DB. Ini murni ROUTING + penamaan key localStorage.
- node --test tetap hijau (laporkan jumlahnya).

---

## §Directive (tempel ke Antigravity)

```
Bug: setelah login, pemilih tidak diarahkan ke halaman setup kunci, sehingga tak
pernah membuat "Kata Sandi Kunci Keamanan"; saat memilih jadi gagal. Penyebab:
kunci privat disimpan dengan nama global 'pace_voter_private_key' padahal
localStorage milik browser, sehingga kunci pemilih LAIN membuat setup-key
terlewat untuk pemilih baru.

Perbaiki (frontend saja, JANGAN sentuh crypto/backend):
1. Scope kunci privat pemilih per voter_id: gunakan nama key
   `pace_voter_private_key_${voterId}` di SEMUA tempat — voter/Login.jsx (cek),
   voter/SetupKey.jsx (simpan), voter/Vote.jsx (baca).
2. Di Login.jsx, setelah login sukses, cek
   localStorage.getItem(`pace_voter_private_key_${data.voter.id}`); jika tidak ada
   -> navigate('/setup-key'); jika ada -> navigate('/dashboard').
3. Pastikan konsistensi nama key: token, voter_id, voter_nim, dan kunci ber-scope
   dibaca/ditulis dengan nama yang sama di seluruh alur pemilih.

JANGAN ubah crypto-engine, PBKDF2/AES-GCM, endpoint, atau skema DB. node --test
harus tetap hijau (laporkan jumlah).

Verifikasi dengan DUA akun berbeda di satu browser:
- Akun A: login -> diarahkan ke setup-key -> buat kata sandi kunci -> pilih ->
  password -> suara terkirim 201 -> resi.
- Akun B (tanpa clear localStorage): login -> TETAP diarahkan ke setup-key
  (karena kunci di-scope per voter_id) -> buat kunci sendiri -> memilih berhasil.
```

---

## §Checklist verifikasi

- [ ] Pemilih baru SELALU diarahkan ke setup-key (walau ada kunci akun lain di browser).
- [ ] Kunci disimpan sebagai `pace_voter_private_key_<voter_id>` (cek di DevTools > Application > localStorage).
- [ ] Dua akun berbeda di satu browser bisa masing-masing setup & memilih tanpa bentrok.
- [ ] Vote.jsx membaca kunci ber-scope milik pemilih aktif; memilih berhasil (201 + resi).
- [ ] node --test tetap hijau.
```
