# DIRECTIVE M4 — Panel KPU / Admin

> Pola sama: tempel **§Directive** ke Antigravity, review Implementation Plan
> terhadap dokumen ini SEBELUM Proceed, verifikasi pakai **§Checklist**.
>
> Sebagian besar BACKEND admin sudah dibuat di M2 (buat pemilu + RSA keygen,
> CRUD kandidat, transisi status, tally). M4 = lengkapi 2 lubang backend di
> bawah, lalu bangun ANTARMUKA React admin. Titik paling berisiko bukan crypto,
> melainkan **UX kunci privat RSA** (lihat §UX Kritis).

---

## Lubang backend yang WAJIB dilengkapi dulu

1. **Aktivasi pemilih (KRITIS).** Saat ini `is_active` default 0 dan `/vote`
   menolak pemilih tak-aktif, tapi tidak ada endpoint untuk mengaktifkan.
   Tanpa ini, tidak ada yang bisa memilih. Tambahkan:
   - `GET  /api/admin/voters` — daftar pemilih (id, nim, name, is_active, has_voted).
   - `PATCH /api/admin/voters/:id/activate` — set is_active = 1 (atau 0).
   - Jangan pernah kembalikan password_hash atau public key lewat endpoint ini.

2. **Autentikasi admin.** Buat tabel `admins(id, username UNIQUE, password_hash,
   created_at)` terpisah dari `voters`. Password di-hash dengan `crypto.scrypt`.
   - Seed satu akun admin lewat script setup yang membaca ADMIN_USERNAME &
     ADMIN_PASSWORD dari `.env` (jangan hardcode kredensial).
   - `POST /api/admin/login` → JWT dengan klaim `role:'admin'`.
   - `authorizeAdmin` memverifikasi klaim `role:'admin'` itu.

3. **Endpoint pendukung (cek apakah M2 sudah ada; jika belum, tambahkan):**
   - `GET /api/admin/elections` + `GET /api/admin/elections/:id` (detail).
   - `GET /api/admin/elections/:id/candidates`.
   - `GET /api/admin/audit-log` — daftar entri audit.
   - `GET /api/admin/audit-log/verify` — hitung ulang rantai HMAC, kembalikan
     { valid: bool, brokenAtSeq: number|null }. (Bukti anti-tampering, BAB 4/6.)

---

## §UX Kritis — penanganan kunci privat RSA (paling berisiko di M4)

Ini bukan soal kode crypto, tapi soal alur manusia yang bisa menghancurkan pemilu.

**A. Saat membuat pemilu (kunci privat ditampilkan SEKALI):**
- Backend mengembalikan `privateKeyPem` hanya sekali. UI WAJIB:
  - Menampilkan modal yang MEMBLOKIR, dengan tombol **Unduh Kunci Privat (.pem)**.
  - Peringatan jelas: "Kunci ini ditampilkan SATU KALI. Tanpa kunci ini, suara
    TIDAK BISA dihitung. Simpan di tempat aman, JANGAN di server."
  - Checkbox konfirmasi "Saya sudah menyimpan kunci ini" yang harus dicentang
    sebelum modal bisa ditutup.
  - JANGAN simpan privateKeyPem ke localStorage, state global, atau log apa pun.

**B. Saat tally (kunci privat dimasukkan kembali):**
- Admin meng-UNGGAH file .pem (baca di klien, kirim via HTTPS ke endpoint tally).
- Setelah tally selesai, HAPUS kunci dari memori/state komponen (set null).
- JANGAN simpan kunci di localStorage; JANGAN tampilkan di URL; JANGAN log.

---

## §Directive (tempel ke Antigravity)

```
Baca DIRECTIVE_M4.md, PRD_PACE_v2.md, AGENTS.md. Pakai endpoint admin M2 yang
sudah ada; JANGAN tulis ulang logika crypto/tally.

TUGAS 1 — Lengkapi backend (lihat DIRECTIVE_M4 §Lubang backend):
  a. Aktivasi pemilih: GET /api/admin/voters, PATCH /api/admin/voters/:id/activate.
  b. Auth admin: tabel admins (scrypt), script seed dari .env (ADMIN_USERNAME/
     ADMIN_PASSWORD), POST /api/admin/login -> JWT role:'admin', authorizeAdmin
     verifikasi klaim role.
  c. Endpoint baca: GET elections, GET election detail, GET candidates,
     GET audit-log, GET audit-log/verify (hitung ulang rantai HMAC).
  Tambah integration test untuk: login admin, aktivasi pemilih, audit verify.

TUGAS 2 — Panel React admin (client/src/admin/):
  - Login.jsx           : login admin (username+password) -> simpan JWT admin.
  - Dashboard.jsx       : daftar pemilu + tombol buat pemilu.
  - CreateElection.jsx  : form buat pemilu. Saat sukses, tampilkan MODAL kunci
                          privat sesuai DIRECTIVE_M4 §UX Kritis A (unduh .pem,
                          peringatan, checkbox konfirmasi, JANGAN persist kunci).
  - Candidates.jsx      : CRUD kandidat (nomor urut, nama, visi, foto).
  - Voters.jsx          : daftar pemilih + tombol aktivasi (konfirmasi).
  - ElectionControl.jsx : buka/tutup pemilu. Tutup = aksi SATU ARAH, wajib
                          dialog konfirmasi ("tidak bisa dibuka kembali").
  - Tally.jsx           : unggah file .pem -> POST tally -> tampilkan hasil per
                          kandidat + jumlah & daftar surat suara INVALID. Setelah
                          selesai, hapus kunci dari state (sesuai §UX Kritis B).
  - AuditLog.jsx        : tampilkan audit log + tombol "Verifikasi Integritas"
                          (panggil /audit-log/verify, tampilkan hijau/merah).
  - Routing admin terpisah dari pemilih; lindungi route dengan cek JWT role admin.

TUGAS 3 — Styling: ikuti skill frontend-design, konsisten dengan tema PACE.
  Jangan kerjakan landing page (M5).

Aturan keras: kunci privat RSA TIDAK BOLEH disimpan di localStorage/state global/
log; hanya transit via HTTPS dan ada di memori sesingkat mungkin. Semua aksi
admin lewat endpoint ber-authorizeAdmin.
Tunggu review saya sebelum lanjut.
```

---

## §Checklist verifikasi manusia (sebelum tutup M4)

**Alur end-to-end yang harus bisa dijalankan**
- [ ] Admin login → buat pemilu → unduh kunci privat → tambah kandidat →
      aktifkan pemilih → buka pemilu → (pemilih memilih dari M3) → tutup pemilu →
      unggah kunci → tally → lihat hasil benar.

**Keamanan kunci privat (paling penting)**
- [ ] Modal kunci privat memblokir & memaksa konfirmasi sebelum ditutup.
- [ ] Cari di kode: privateKeyPem TIDAK pernah masuk localStorage / state global / console.log.
- [ ] Setelah tally, kunci dihapus dari state (cek: tidak tertinggal di memori komponen).
- [ ] DevTools → Application → localStorage: tidak ada kunci privat RSA tersimpan.

**Kontrol akses**
- [ ] Endpoint admin menolak JWT pemilih biasa (tanpa role admin) → 401/403.
- [ ] Pemilih tidak bisa mengakses route panel admin.

**Integritas pemilu**
- [ ] Tutup pemilu bersifat satu arah (coba closed→open ditolak).
- [ ] Tally hanya jalan saat status 'closed'.
- [ ] Tombol Verifikasi Integritas audit log: hijau saat utuh; ubah 1 baris
      audit_log di DB secara manual → verifikasi jadi merah & menunjuk seq rusak.

**Bukti (laporan)**
- [ ] Screenshot: modal kunci, hasil tally + daftar invalid, audit verify hijau/merah.

---

## §Catatan keterbatasan (untuk BAB 7)

- **Kepercayaan pada admin tunggal:** satu admin memegang kunci privat = titik
  kepercayaan terpusat. Jika kunci itu bocor/hilang, kerahasiaan/penghitungan
  jatuh. Solusi lanjut: *threshold cryptography* (kunci dibagi ke N panitia,
  butuh k dari N untuk dekripsi). Sebutkan sebagai pengembangan, jangan diklaim.
- **Audit log dijaga AUDIT_KEY di server:** penyerang yang menguasai server bisa
  memalsukan rantai. Mitigasi lanjut: anchoring hash ke media eksternal
  (append-only log / publikasi berkala). Akui jujur.
