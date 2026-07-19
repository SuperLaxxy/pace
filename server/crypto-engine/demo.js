const crypto = require('crypto');
const { aesEncrypt, aesDecrypt } = require('./aes');
const { hmacTag, hmacVerify } = require('./hmac');
const { generateRsaKeypair, rsaWrapKey, rsaUnwrapKey } = require('./rsa');
const { generateEcdsaKeypair, signBallot, verifyBallot } = require('./ecdsa');

function runDemo() {
  console.log("=== PACE Crypto Engine Demo ===\n");

  // 1. Generate Election Keypair (RSA)
  const rsaKeys = generateRsaKeypair();
  console.log("[1] Election RSA Keypair Generated (KPU)");

  // 2. Generate Voter Keypair (ECDSA)
  const voterKeys = generateEcdsaKeypair();
  console.log("[2] Voter ECDSA Keypair Generated (Browser)\n");

  // 3. Voter casts a ballot
  const plaintext = "Kandidat A";
  console.log("Voter chooses:", plaintext);

  const kEnc = crypto.randomBytes(32);
  const kMac = crypto.randomBytes(32);

  const { iv, ciphertext } = aesEncrypt(plaintext, kEnc);
  console.log("\n--- Encryption ---");
  console.log("IV (Hex):", iv);
  console.log("Ciphertext (Hex):", ciphertext);

  const tag = hmacTag(kMac, iv, ciphertext);
  console.log("HMAC-SHA256 Tag (Hex):", tag);

  const keyMaterial = Buffer.concat([kEnc, kMac]);
  const wrappedKey = rsaWrapKey(rsaKeys.publicKey, keyMaterial);
  console.log("Wrapped Keys (Base64):", wrappedKey.substring(0, 64) + "...");

  const nonce = "nonce-" + Date.now();
  const timestamp = Date.now().toString();
  const envelopeData = `${iv}|${ciphertext}|${tag}|${nonce}|${timestamp}`;
  const signature = signBallot(voterKeys.privateKey, envelopeData);
  console.log("ECDSA Signature (Base64):", signature);

  console.log("\n--- Tally Verification ---");
  // 4. KPU Verify and Decrypt
  const isSigValid = verifyBallot(voterKeys.publicKey, envelopeData, signature);
  console.log("Signature Verification:", isSigValid ? "PASSED" : "FAILED");

  const unwrapped = rsaUnwrapKey(rsaKeys.privateKey, wrappedKey);
  const recoveredKEnc = unwrapped.subarray(0, 32);
  const recoveredKMac = unwrapped.subarray(32, 64);

  const isTagValid = hmacVerify(recoveredKMac, iv, ciphertext, tag);
  console.log("HMAC Verification:", isTagValid ? "PASSED" : "FAILED");

  if (isSigValid && isTagValid) {
    const decrypted = aesDecrypt(iv, ciphertext, recoveredKEnc);
    console.log("Decrypted Ballot:", decrypted);
  }
}

runDemo();
