const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCompetitionDates(start: string | Date, end: string | Date) {
  return `${dateFormat.format(new Date(start))} – ${dateFormat.format(new Date(end))}`;
}
