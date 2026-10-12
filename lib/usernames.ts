export const DEFAULT_WAKIL_PASSWORD = "mykhairat";
export function usernameBase(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)[0]
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || "wakil"
  );
}
export function uniqueUsername(name: string, occupied: Set<string>) {
  const base = usernameBase(name);
  let candidate = base;
  let suffix = 2;
  while (occupied.has(candidate)) candidate = `${base}${suffix++}`;
  occupied.add(candidate);
  return candidate;
}
