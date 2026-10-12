import { randomBytes, createHash, timingSafeEqual } from "crypto";
export function issueActivation() {
  const code = randomBytes(5).toString("hex").toUpperCase();
  return {
    code,
    hash: createHash("sha256").update(code).digest("hex"),
    expires: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
}
export function verifyActivation(
  code: string,
  hash: string | null,
  expires: string | null,
) {
  if (!hash || !expires || new Date(expires).getTime() < Date.now())
    return false;
  const actual = createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest();
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
