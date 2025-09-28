export const escapeIcs = (text: string) =>
  text.replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export const formatDateForIcs = (value: Date) =>
  value.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

export interface CalendarEventInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  updatedAt?: Date;
  createdAt?: Date;
}

export const buildSingleEventCalendar = (event: CalendarEventInput) => {
  const now = event.updatedAt ?? event.createdAt ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MMO Match//Guild Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateForIcs(now)}`,
    `DTSTART:${formatDateForIcs(event.startsAt)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : undefined,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
};
