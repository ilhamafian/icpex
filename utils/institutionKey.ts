/**
 * Matching key for free-text university names: lowercase, punctuation
 * removed, whitespace collapsed. "Universiti Malaya." → "universiti malaya".
 */
export function normalizeInstitution(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
