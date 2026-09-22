import { formatInTimeZone } from "date-fns-tz";

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

export function buildCalendarInvite(params: {
  uid: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  organizerEmail?: string;
  attendeeEmail?: string;
  location?: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenBarber//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(params.startsAt)}`,
    `DTEND:${formatIcsDate(params.endsAt)}`,
    `SUMMARY:${escapeIcs(params.summary)}`,
    `DESCRIPTION:${escapeIcs(params.description)}`,
  ];

  if (params.location) {
    lines.push(`LOCATION:${escapeIcs(params.location)}`);
  }
  if (params.organizerEmail) {
    lines.push(`ORGANIZER:mailto:${params.organizerEmail}`);
  }
  if (params.attendeeEmail) {
    lines.push(
      `ATTENDEE;CN=${escapeIcs(params.attendeeEmail)};RSVP=TRUE:mailto:${params.attendeeEmail}`,
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
