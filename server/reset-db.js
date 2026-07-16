// reset-db.js — taruh di server/, jalankan DARI server/: node reset-db.js
// Menghapus file DB + file WAL/SHM pendamping. Server HARUS dimatikan dulu.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'db');
const targets = ['pace.db', 'pace.db-wal', 'pace.db-shm'];

let removed = 0;
for (const f of targets) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log('Dihapus:', f);
      removed++;
    } catch (err) {
      console.error(`Gagal menghapus ${f}. Pastikan server dimatikan.`, err.message);
    }
  }
}
console.log(removed ? `\nSelesai. ${removed} file dihapus. Start server untuk membuat DB bersih.`
                    : '\nTidak ada file DB ditemukan (mungkin sudah bersih).');
console.log('PENTING: pastikan server dimatikan saat menjalankan ini, lalu seed admin ulang.');
