export function samePersistedValue(left: unknown, right: unknown): boolean {
  const pending: [unknown, unknown][] = [[left, right]];
  while (pending.length > 0) {
    const pair = pending.pop()!;
    const a = typeof pair[0] === "number" && !Number.isFinite(pair[0]) ? null : pair[0];
    const b = typeof pair[1] === "number" && !Number.isFinite(pair[1]) ? null : pair[1];
    if (a === b) continue;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (let index = 0; index < a.length; index++) pending.push([a[index], b[index]]);
      continue;
    }
    const entries = Object.entries(a).filter(([, value]) => value !== undefined);
    const other = new Map(Object.entries(b).filter(([, value]) => value !== undefined));
    if (entries.length !== other.size) return false;
    for (const [key, value] of entries) {
      if (!other.has(key)) return false;
      pending.push([value, other.get(key)]);
    }
  }
  return true;
}
