console.log('=== SKRIP BERJALAN ===');
const { db } = require('../db/index');
const cmd = process.argv[2];
const id = process.argv[3];
console.log('Perintah:', cmd, '| ID:', id || '(kosong)');

if (cmd === 'lihat') {
    const rows = db.prepare('SELECT id, substr(ciphertext,1,12) AS awal FROM ballots').all();
    console.log('Jumlah surat suara ditemukan:', rows.length);
    console.table(rows);

} else if (cmd === 'rusak') {
    const row = db.prepare('SELECT ciphertext FROM ballots WHERE id = ?').get(id);
    if (!row) { console.log('GAGAL: ID tidak ditemukan.'); }
    else {
        db.prepare('UPDATE ballots SET ciphertext = ? WHERE id = ?')
            .run('deadbeef' + row.ciphertext.slice(8), id);
        console.log('BERHASIL: surat suara', id, 'sudah dirusak.');
    }

} else {
    console.log('Perintah tersedia: lihat | rusak <id>');
}
console.log('=== SKRIP SELESAI ===');