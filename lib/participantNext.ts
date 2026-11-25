/** Only send participants back into their own dashboard. */
export function safeParticipantNext(value: unknown): string {
  if (typeof value !== "string") return "/my";
  if (!value.startsWith("/my")) return "/my";
  if (value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return "/my";
  }
  return value;
}
