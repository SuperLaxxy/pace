/**
 * serialize.js
 * 
 * Modul ini dipisahkan agar dapat di-import langsung oleh sisi klien (browser)
 * maupun sisi server (Node.js) sebagai satu sumber kebenaran (single source of truth).
 * Mencegah drift/perbedaan format serialisasi amplop antara klien dan server.
 */

const ENVELOPE_FIELDS = [
  'electionId',   // pengikatan konteks: tanda tangan hanya berlaku utk pemilu ini
  'wrappedKey',   // ikut ditandatangani agar tidak bisa ditukar
  'iv',
  'ciphertext',
  'tag',
  'nonce',        // anti-replay (dedup WAJIB lewat nonce, BUKAN signature)
  'timestamp',
];

/**
 * Menghasilkan representasi kanonik (string) dari amplop surat suara untuk
 * ditandatangani / diverifikasi. Deterministik: input sama -> output sama.
 * @param {Object} envelope - objek berisi seluruh field di ENVELOPE_FIELDS.
 * @returns {string} string kanonik siap untuk signBallot/verifyBallot.
 */
function serializeEnvelope(envelope) {
  const ordered = {};
  for (const field of ENVELOPE_FIELDS) {
    const value = envelope[field];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Envelope tidak lengkap: field wajib "${field}" kosong`);
    }
    ordered[field] = String(value); // paksa tipe string untuk konsistensi
  }
  return JSON.stringify(ordered); // urutan kunci dijamin oleh ENVELOPE_FIELDS
}

// Selalu set ke globalThis agar dapat diakses dari browser ES modules
globalThis.serializeModule = { ENVELOPE_FIELDS, serializeEnvelope };

// Support CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ENVELOPE_FIELDS, serializeEnvelope };
}
