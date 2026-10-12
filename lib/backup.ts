import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { gzipSync, gunzipSync } from "zlib";
export const BACKUP_TABLES = [
  "settings",
  "families",
  "users",
  "members",
  "receipts",
  "payments",
  "member_requests",
  "claims",
  "activity_log",
  "monthly_assessments",
  "contribution_policies",
  "fund_entries",
  "bank_reconciliations",
  "import_batches",
  "legacy_imports",
  "legacy_issues",
] as const;
export function encryptBackup(value: unknown, passphrase: string) {
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = scryptSync(passphrase, salt, 32),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(gzipSync(Buffer.from(JSON.stringify(value), "utf8"))),
    cipher.final(),
  ]);
  return {
    format: "mykhairat-encrypted-v1",
    compression: "gzip",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
}
export function decryptBackup(
  value: {
    format: string;
    salt: string;
    iv: string;
    tag: string;
    data: string;
    compression?: string;
  },
  passphrase: string,
) {
  if (value.format !== "mykhairat-encrypted-v1")
    throw new Error("Format backup tidak sah.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    scryptSync(passphrase, Buffer.from(value.salt, "base64"), 32),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  const clear = Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(
    (value.compression === "gzip" ? gunzipSync(clear) : clear).toString("utf8"),
  );
}
