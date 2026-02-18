import crypto from "crypto";
import { getConfig } from "@/server/config";
import { AppError } from "@/server/errors";

const VERSION = "v1";
const IV_BYTES = 12;

function getKey(): Buffer {
  const config = getConfig();
  // Derive a stable 256-bit key from configured secret string.
  return crypto.createHash("sha256").update(config.ENCRYPTION_KEY).digest();
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${toBase64Url(iv)}:${toBase64Url(tag)}:${toBase64Url(encrypted)}`;
}

export function decryptSecret(cipherText: string): string {
  const [version, ivText, tagText, payloadText] = cipherText.split(":");
  if (version !== VERSION || !ivText || !tagText || !payloadText) {
    throw new AppError("INVALID_SECRET_PAYLOAD", "Unable to decrypt stored secret", 500);
  }

  const key = getKey();
  const iv = fromBase64Url(ivText);
  const tag = fromBase64Url(tagText);
  const payload = fromBase64Url(payloadText);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString("utf8");
}

export function decryptSecretOrReturnRaw(value: string): string {
  // Backward compatibility for data stored before encryption-at-rest was added.
  if (value.startsWith("sk_")) {
    return value;
  }
  return decryptSecret(value);
}

