const { test } = require('node:test');
const assert = require('node:assert');

const { serializeEnvelope } = require('../envelope');
const { generateEcdsaKeypair, signBallot, verifyBallot } = require('../ecdsa');

/**
 * envelope.test.js
 * --------------------------------------------------------------------------
 * Membuktikan bahwa serialisasi kanonik (serializeEnvelope) menutup celah
 * "ambiguitas batas antar-field" (temuan review M1, severity HIGH).
 *
 * Skenario serangan: dua surat suara yang BERBEDA dibuat sedemikian rupa
 * sehingga, dengan penggabungan string NAIF (iv + ciphertext + ...), keduanya
 * menghasilkan untaian byte yang SAMA -> tanda tangan untuk amplop A jadi sah
 * juga untuk amplop B. Test ini menunjukkan: (1) celah itu nyata pada cara naif,
 * dan (2) serializeEnvelope menghilangkannya.
 */

// --- Dua amplop yang HANYA berbeda di batas iv/ciphertext ---------------
const base = {
  electionId: 'PEMIRA-2026',
  wrappedKey: 'WRAP',
  tag: 'TAG',
  nonce: 'NONCE-001',
  timestamp: '1700000000',
};

// 'dead' + 'beef'  ==  'dea' + 'dbeef'  (sama-sama "deadbeef")
const envelopeA = { ...base, iv: 'dead', ciphertext: 'beef' };
const envelopeB = { ...base, iv: 'dea', ciphertext: 'dbeef' };

// Cara LAMA yang rentan: gabung string tanpa pembatas yang jelas.
function naiveConcat(env) {
  return env.electionId + env.wrappedKey + env.iv + env.ciphertext +
         env.tag + env.nonce + env.timestamp;
}

// --- 1. Buktikan celah pada penggabungan naif ---------------------------
test('VULN: penggabungan naif membuat dua amplop berbeda jadi identik', () => {
  // Inilah akar masalahnya: tanda tangan tidak bisa membedakan A dan B.
  assert.strictEqual(naiveConcat(envelopeA), naiveConcat(envelopeB));
});

// --- 2. serializeEnvelope menghilangkan ambiguitas ----------------------
test('FIX: serializeEnvelope menghasilkan untaian BERBEDA untuk A dan B', () => {
  assert.notStrictEqual(serializeEnvelope(envelopeA), serializeEnvelope(envelopeB));
});

// --- 3. Kontrol positif: tanda tangan A sah untuk A ---------------------
test('tanda tangan amplop A terverifikasi untuk amplop A (sanity)', () => {
  const { publicKey, privateKey } = generateEcdsaKeypair();
  const sigA = signBallot(privateKey, serializeEnvelope(envelopeA));
  assert.strictEqual(verifyBallot(publicKey, serializeEnvelope(envelopeA), sigA), true);
});

// --- 4. INTI KEAMANAN: tanda tangan A DITOLAK untuk amplop B ------------
test('SECURITY: tanda tangan amplop A DITOLAK untuk amplop B', () => {
  const { publicKey, privateKey } = generateEcdsaKeypair();
  const sigA = signBallot(privateKey, serializeEnvelope(envelopeA));
  // Penyerang mencoba memakai ulang tanda tangan A pada amplop B yang berbeda.
  assert.strictEqual(verifyBallot(publicKey, serializeEnvelope(envelopeB), sigA), false);
});

// --- 5. serializeEnvelope menolak amplop tidak lengkap ------------------
test('serializeEnvelope melempar error jika ada field wajib yang kosong', () => {
  const incomplete = { ...base, iv: 'dead' }; // ciphertext hilang
  assert.throws(() => serializeEnvelope(incomplete), /ciphertext/);
});
