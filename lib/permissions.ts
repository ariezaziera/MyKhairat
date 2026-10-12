export type Permission =
  | "read"
  | "families"
  | "payments"
  | "approve"
  | "claims"
  | "settings"
  | "accounts"
  | "audit";
export type AccessProfile = "owner" | "treasurer" | "approver" | "auditor";
const grants: Record<AccessProfile, Permission[]> = {
  owner: [
    "read",
    "families",
    "payments",
    "approve",
    "claims",
    "settings",
    "accounts",
    "audit",
  ],
  treasurer: ["read", "families", "payments"],
  approver: ["read", "approve", "claims"],
  auditor: ["read", "audit"],
};
export function can(profile: string | undefined, permission: Permission) {
  return (
    grants[(profile ?? "owner") as AccessProfile]?.includes(permission) ?? false
  );
}
