/**
 * Extract C identifier candidates from a natural language query.
 * Matches tokens with underscores, mixed-case, or all-caps — typical of C symbol names.
 */
export function extractIdentifiers(query: string): string[] {
  const candidates = new Set<string>();
  const tokens = query.match(/\b[A-Za-z_][A-Za-z0-9_]+\b/g) ?? [];
  for (const t of tokens) {
    const hasUnderscore = t.includes("_");
    const isMixedCase = /[A-Z]/.test(t) && /[a-z]/.test(t);
    const isAllCaps = /^[A-Z]{2,}$/.test(t);
    if (hasUnderscore || isMixedCase || isAllCaps) {
      candidates.add(t);
    }
  }
  return [...candidates];
}
