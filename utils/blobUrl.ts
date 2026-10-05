/** True for URLs served by Vercel Blob (public or private stores). */
export function isBlobStoreUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}
