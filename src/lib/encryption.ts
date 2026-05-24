import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX   = process.env.ENCRYPTION_KEY ?? "";

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(KEY_HEX, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc1 = cipher.update(plaintext, "utf8");
  const enc2 = cipher.final();
  const tag  = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return [iv.toString("hex"), tag.toString("hex"), Buffer.concat([enc1, enc2]).toString("hex")].join(":");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivHex, tagHex, ctHex] = payload.split(":");
  const iv         = Buffer.from(ivHex, "hex");
  const tag        = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");
  const decipher   = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const dec1 = decipher.update(ciphertext);
  const dec2 = decipher.final();
  return Buffer.concat([dec1, dec2]).toString("utf8");
}
