import crypto from "node:crypto";
import * as store from "./store";

// The root secret: WAKESET_SECRET, or one generated on first use and kept in
// the database. The sign-in cookie is signed with it directly; anything
// encrypted at rest uses a key derived from it, so the two are never the same key.
export function rootSecret(): Buffer {
  const fromEnv = process.env.WAKESET_SECRET;
  if (fromEnv && fromEnv.length >= 16) return Buffer.from(fromEnv);
  let saved = store.read<string>(store.SYSTEM, "secret", "");
  if (!saved) store.write(store.SYSTEM, "secret", (saved = crypto.randomBytes(32).toString("hex")));
  return Buffer.from(saved);
}

// The label is part of the key. Never change it: every saved API key would become unreadable.
const encryptionKey = () => crypto.createHmac("sha256", rootSecret()).update("wakeset:encryption:v1").digest();

/** AES-256-GCM. The result carries its own nonce and integrity tag. */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

/** The original text, or undefined if it cannot be read (the secret changed, or the value was altered). */
export function decrypt(value: string): string | undefined {
  try {
    const [iv, tag, body] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}
