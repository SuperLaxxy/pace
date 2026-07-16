# PACE (Papua Cyber Election)

Sistem e-voting aman untuk KPU Mahasiswa.

## Setup & Instalasi

1. Clone repositori ini.
2. Setup environment variables di `.env` (lihat contoh). Pastikan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` telah diisi.
3. Install dependensi backend dan frontend:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

## Inisialisasi Database & Admin

PACE tidak lagi menyemai (seed) admin secara otomatis saat server berjalan. Anda WAJIB menjalankan script seed manual sekali setelah setup awal.

```bash
cd server
npm run seed:admin
```
Script ini idempoten dan akan membaca `ADMIN_USERNAME` dan `ADMIN_PASSWORD` dari `.env`. Jika admin sudah ada, script tidak akan menimpa data.

## Menjalankan Aplikasi

- Backend: `cd server && npm start`
- Frontend: `cd client && npm run dev`
