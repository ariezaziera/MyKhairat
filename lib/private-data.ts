import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
function key() {
  const secret =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-mykhairat-secret-change-in-production"
      : "");
  if (!secret) throw new Error("Kunci perlindungan data belum ditetapkan.");
  return createHash("sha256")
    .update("mykhairat:private-data:v1:" + secret)
    .digest();
}
export function protectIC(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("enc:v1:")) return value;
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "enc",
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}
export function revealIC(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("enc:v1:")) return value;
  const [, , iv, tag, data] = value.split(":");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    cipher.update(Buffer.from(data, "base64")),
    cipher.final(),
  ]).toString("utf8");
}
