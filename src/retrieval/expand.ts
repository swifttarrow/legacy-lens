/**
 * Heuristic multi-query expansion for Doom C source retrieval.
 * Produces up to 4 variants without any LLM call to keep costs minimal.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "to", "of", "in",
  "on", "at", "by", "for", "with", "about", "into", "through", "how",
  "explain", "what", "which", "where", "when", "why", "and", "or", "but",
  "not", "this", "that", "these", "those", "it", "its", "from", "up",
  "down", "me", "show", "tell", "find", "get",
]);

/** Return 3-4 query variants for deep multi-query retrieval. */
export function expandQuery(query: string): string[] {
  const tokens = query.split(/\s+/);

  // Dense variant: strip stop words to surface key terms
  const denseTokens = tokens.filter(
    (w) => !STOP_WORDS.has(w.toLowerCase()) && w.length > 1,
  );
  const dense = denseTokens.join(" ");

  const core = dense || query;

  const variants = [
    query,
    ...(dense && dense !== query ? [dense] : []),
    `C function implementation ${core}`,
    `Doom game engine ${core}`,
  ];

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const v of variants) {
    const trimmed = v.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      unique.push(trimmed);
    }
  }

  return unique;
}
