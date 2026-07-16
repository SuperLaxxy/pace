// inspect-users.js — taruh di folder server/, jalankan: node inspect-users.js
// Read-only. Menampilkan akun admin & pemilih terdaftar. TIDAK menampilkan password hash.

const path = require('path');
const Database = require('better-sqlite3');

// DB file dipakai saat aplikasi berjalan normal (npm run dev)
const dbPath = path.join(__dirname, 'db', 'pace.db');

let db;
try {
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
} catch (e) {
  console.error(`Tidak bisa membuka DB di: ${dbPath}`);
  console.error('Pastikan path benar & aplikasi pernah dijalankan (npm run dev).');
  process.exit(1);
}

console.log('\n=== AKUN ADMIN (tabel admins) ===');
const admins = db.prepare('SELECT id, username, created_at FROM admins').all();
if (admins.length === 0) {
  console.log('(kosong) -> admin BELUM ter-seed. Inilah kemungkinan sebab login gagal.');
} else {
  console.table(admins); // sengaja tanpa kolom password_hash
}

console.log('\n=== PEMILIH TERDAFTAR (tabel voters) ===');
const voters = db.prepare(
  'SELECT id, nim, name, is_active, has_voted, created_at FROM voters'
).all();
console.table(voters);

console.log(`\nTotal admin: ${admins.length} | Total pemilih terdaftar: ${voters.length}`);
db.close();
