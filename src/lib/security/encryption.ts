import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function loadMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY missing. Generate with: openssl rand -hex 32",
    );
  }
  if (hex.length !== KEY_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes).`,
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): EncryptedPayload {
  const key = loadMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decrypt(payload: EncryptedPayload): string {
  const key = loadMasterKey();
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const ciphertext = Buffer.from(payload.ciphertext, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error(
      "Decryption failed: ciphertext was tampered with or wrong key.",
    );
  }
}
