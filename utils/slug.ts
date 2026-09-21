/**
 * Builds a human-readable slug from a display name.
 * "ICPEX 2026" → "icpex-2026"
 * "Undergraduate Thesis" → "undergraduate-thesis"
 */
export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "item";
}

/**
 * Returns `base`, or `base-2`, `base-3`, … until `isTaken` is false.
 */
export async function uniqueSlug(
  baseName: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(baseName);
  if (!(await isTaken(base))) {
    return base;
  }

  let suffix = 2;
  while (await isTaken(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
