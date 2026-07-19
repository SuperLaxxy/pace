const { aesDecrypt } = require('./aes');
const { hmacVerify } = require('./hmac');

/**
 * envelope.js
 * --------------------------------------------------------------------------
 * Memperbaiki temuan review M1:
 *  - HIGH  : ambiguitas serialisasi data yang ditandatangani ECDSA.
 *  - MEDIUM: pengikatan konteks (electionId) + wrappedKey ikut ditandatangani.
 *  - Guard : memaksa urutan Encrypt-then-MAC (verify HMAC SEBELUM decrypt).
 *
 * Aturan: SEMUA proses sign/verify surat suara WAJIB lewat serializeEnvelope().
 * Jangan pernah menggabung field secara manual (mis. iv + ciphertext + ...),
 * karena batas antar-field jadi ambigu dan bisa dieksploitasi.
 */

const { ENVELOPE_FIELDS, serializeEnvelope } = require('./serialize');

/**
 * Membuka surat suara dengan AMAN: verifikasi HMAC DULU, baru dekripsi.
 * Mencegah padding-oracle attack pada AES-CBC karena dekripsi tidak pernah
 * dijalankan atas data yang belum terautentikasi.
 *
 * @param {Object} parts - { iv, ciphertext, tag } (hex strings)
 * @param {Buffer} keyEnc - kunci AES 32-byte (hasil unwrap RSA)
 * @param {Buffer} keyMac - kunci MAC 32-byte (hasil unwrap RSA)
 * @returns {Object} { ok: boolean, plaintext?: string, reason?: string }
 */
function openBallot({ iv, ciphertext, tag }, keyEnc, keyMac) {
  // LANGKAH 1 — autentikasi integritas. Gagal => berhenti, jangan dekripsi.
  if (!hmacVerify(keyMac, iv, ciphertext, tag)) {
    return { ok: false, reason: 'HMAC_INVALID' };
  }

  // LANGKAH 2 — baru dekripsi setelah terbukti utuh & autentik.
  try {
    const plaintext = aesDecrypt(iv, ciphertext, keyEnc);
    return { ok: true, plaintext };
  } catch (e) {
    // padding/format rusak: tetap gagal dengan tenang, tanpa membocorkan detail
    return { ok: false, reason: 'DECRYPT_FAILED' };
  }
}

module.exports = {
  ENVELOPE_FIELDS,
  serializeEnvelope,
  openBallot,
};
