"use client";
import { createContext, useContext, type ReactNode } from "react";
import { can, type Permission } from "@/lib/permissions";
const Context = createContext("owner");
export function AdminPermissions({
  profile,
  children,
}: {
  profile: string;
  children: ReactNode;
}) {
  return <Context.Provider value={profile}>{children}</Context.Provider>;
}
export function useAdminPermission(permission: Permission) {
  return can(useContext(Context), permission);
}
