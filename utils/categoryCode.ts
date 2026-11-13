/**
 * Short code used in registration numbers.
 * "Internet of Things" → "IOT". A single word keeps its first three letters.
 */
export function categoryRegistrationCode(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9.]+/)
    .map((word) => word.replace(/^\.+|\.+$/g, ""))
    .filter((word) => /[A-Za-z]/.test(word));

  if (words.length === 0) return "REG";
  if (words.length === 1) {
    const letters = words[0].replace(/[^A-Za-z]/g, "");
    return letters.slice(0, 3).toUpperCase() || "REG";
  }
  return words.map((word) => word[0]).join("").toUpperCase();
}
