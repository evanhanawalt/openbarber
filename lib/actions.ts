"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  appointments,
  appointmentTypes,
  availabilityOverrides,
  bookingRequests,
  scheduleSettings,
  slotOffers,
  weeklyAvailability,
} from "@/lib/db/schema";
import {
  getAvailableSlotsForDay,
  getScheduleContext,
  listOpenDays,
} from "@/lib/scheduling/availability";
import { emailSender, smsSender } from "@/lib/notify";
import { buildCalendarInvite } from "@/lib/calendar/ics";
import { getAuthEnv } from "@/lib/auth-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getOpenBookingDays() {
  const { settings, weekly, overrides } = await getScheduleContext();
  return listOpenDays(settings, weekly, overrides);
}

export async function createBookingRequest(input: {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  requestedDate: string;
  notes?: string;
}) {
  const name = input.clientName.trim();
  if (!name) throw new Error("Name is required");
  if (!input.clientEmail?.trim() && !input.clientPhone?.trim()) {
    throw new Error("Email or phone is required");
  }

  const { settings, weekly, overrides, appointmentType } =
    await getScheduleContext();
  const openDays = listOpenDays(settings, weekly, overrides);
  if (!openDays.includes(input.requestedDate)) {
    throw new Error("That day is not open for scheduling");
  }

  const [request] = await db
    .insert(bookingRequests)
    .values({
      clientName: name,
      clientEmail: input.clientEmail?.trim() || null,
      clientPhone: input.clientPhone?.trim() || null,
      requestedDate: input.requestedDate,
      notes: input.notes?.trim() || null,
      appointmentTypeId: appointmentType.id,
      status: "pending",
    })
    .returning();

  const adminEmail = getAuthEnv().adminEmails[0];
  await emailSender.send({
    to: adminEmail,
    subject: `New booking request from ${name}`,
    text: `${name} requested ${input.requestedDate}.\nEmail: ${input.clientEmail ?? "—"}\nPhone: ${input.clientPhone ?? "—"}\n\nOpen admin → Requests to respond.`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  return { id: request.id };
}

export async function updateScheduleSettings(input: {
  bookingHorizonDays: number;
  timezone: string;
  slotIntervalMinutes: number;
  bufferMinutes: number;
}) {
  await requireAdmin();
  const [existing] = await db.select().from(scheduleSettings).limit(1);
  if (!existing) throw new Error("Settings missing");

  await db
    .update(scheduleSettings)
    .set({
      bookingHorizonDays: input.bookingHorizonDays,
      timezone: input.timezone,
      slotIntervalMinutes: input.slotIntervalMinutes,
      bufferMinutes: input.bufferMinutes,
      updatedAt: new Date(),
    })
    .where(eq(scheduleSettings.id, existing.id));

  revalidatePath("/admin/schedule");
  revalidatePath("/");
}

export async function updateWeeklyAvailability(
  rows: {
    id: string;
    startTime: string;
    endTime: string;
    isClosed: boolean;
  }[],
) {
  await requireAdmin();
  for (const row of rows) {
    await db
      .update(weeklyAvailability)
      .set({
        startTime: normalizeTime(row.startTime),
        endTime: normalizeTime(row.endTime),
        isClosed: row.isClosed,
      })
      .where(eq(weeklyAvailability.id, row.id));
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/");
}

export async function upsertAvailabilityOverride(input: {
  date: string;
  isClosed: boolean;
  startTime?: string;
  endTime?: string;
  note?: string;
}) {
  await requireAdmin();
  const existing = await db
    .select()
    .from(availabilityOverrides)
    .where(eq(availabilityOverrides.date, input.date))
    .limit(1);

  const values = {
    date: input.date,
    isClosed: input.isClosed,
    startTime: input.isClosed
      ? null
      : normalizeTime(input.startTime || "09:00"),
    endTime: input.isClosed ? null : normalizeTime(input.endTime || "17:00"),
    note: input.note?.trim() || null,
  };

  if (existing[0]) {
    await db
      .update(availabilityOverrides)
      .set(values)
      .where(eq(availabilityOverrides.id, existing[0].id));
  } else {
    await db.insert(availabilityOverrides).values(values);
  }

  revalidatePath("/admin/schedule");
  revalidatePath("/");
}

export async function deleteAvailabilityOverride(id: string) {
  await requireAdmin();
  await db
    .delete(availabilityOverrides)
    .where(eq(availabilityOverrides.id, id));
  revalidatePath("/admin/schedule");
  revalidatePath("/");
}

export async function sendSlotOffers(input: {
  requestId: string;
  slotStarts: string[]; // ISO timestamps
  channel: "email" | "sms" | "both";
}) {
  await requireAdmin();
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, input.requestId))
    .limit(1);
  if (!request) throw new Error("Request not found");

  const { settings, appointmentType } = await getScheduleContext();
  const duration = appointmentType.durationMinutes;

  if (input.slotStarts.length === 0) {
    throw new Error("Select at least one timeslot");
  }

  await db
    .delete(slotOffers)
    .where(eq(slotOffers.bookingRequestId, request.id));

  const offerRows = input.slotStarts.map((iso) => {
    const startsAt = new Date(iso);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    return {
      bookingRequestId: request.id,
      startsAt,
      endsAt,
    };
  });

  await db.insert(slotOffers).values(offerRows);

  await db
    .update(bookingRequests)
    .set({ status: "offered", updatedAt: new Date() })
    .where(eq(bookingRequests.id, request.id));

  const labels = offerRows
    .map((o) =>
      formatInTimeZone(o.startsAt, settings.timezone, "EEE MMM d · h:mm a"),
    )
    .join("\n");

  const body = `Hi ${request.clientName},\n\nHere are some times that work for ${request.requestedDate}:\n\n${labels}\n\nReply to let us know which works, or if none do we can look at other openings.\n\n— OpenBarber`;

  if (
    (input.channel === "email" || input.channel === "both") &&
    request.clientEmail
  ) {
    await emailSender.send({
      to: request.clientEmail,
      subject: "Available appointment times",
      text: body,
    });
  }

  if (
    (input.channel === "sms" || input.channel === "both") &&
    request.clientPhone
  ) {
    await smsSender.send({
      to: request.clientPhone,
      body: body.slice(0, 320),
    });
  }

  revalidatePath(`/admin/requests/${request.id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

export async function confirmAppointment(input: {
  requestId: string;
  startsAt: string;
  notes?: string;
}) {
  await requireAdmin();
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, input.requestId))
    .limit(1);
  if (!request) throw new Error("Request not found");

  const { settings, appointmentType } = await getScheduleContext();
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + appointmentType.durationMinutes * 60_000,
  );

  const [appointment] = await db
    .insert(appointments)
    .values({
      appointmentTypeId: request.appointmentTypeId ?? appointmentType.id,
      bookingRequestId: request.id,
      clientName: request.clientName,
      clientEmail: request.clientEmail,
      clientPhone: request.clientPhone,
      startsAt,
      endsAt,
      status: "confirmed",
      notes: input.notes?.trim() || request.notes,
    })
    .returning();

  await db
    .update(bookingRequests)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(bookingRequests.id, request.id));

  if (request.clientEmail) {
    const ics = buildCalendarInvite({
      uid: `${appointment.id}@openbarber`,
      summary: `${appointmentType.name} — OpenBarber`,
      description: `Appointment for ${request.clientName}`,
      startsAt,
      endsAt,
      organizerEmail: getAuthEnv().adminEmails[0],
      attendeeEmail: request.clientEmail,
    });

    const when = formatInTimeZone(
      startsAt,
      settings.timezone,
      "EEEE, MMM d · h:mm a",
    );

    await emailSender.send({
      to: request.clientEmail,
      subject: `Confirmed: ${appointmentType.name} on ${when}`,
      text: `Hi ${request.clientName},\n\nYour appointment is confirmed for ${when}.\nA calendar invite is attached.\n\n— OpenBarber`,
      attachments: [
        {
          filename: "appointment.ics",
          content: ics,
          contentType: "text/calendar; charset=utf-8",
        },
      ],
    });
  }

  revalidatePath(`/admin/requests/${request.id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  revalidatePath("/");
  return { id: appointment.id };
}

export async function declineBookingRequest(requestId: string) {
  await requireAdmin();
  await db
    .update(bookingRequests)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(bookingRequests.id, requestId));
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

export async function cancelAppointment(appointmentId: string) {
  await requireAdmin();
  await db
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createManualAppointment(input: {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  startsAt: string;
  notes?: string;
}) {
  await requireAdmin();
  const { appointmentType } = await getScheduleContext();
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + appointmentType.durationMinutes * 60_000,
  );

  const [appointment] = await db
    .insert(appointments)
    .values({
      appointmentTypeId: appointmentType.id,
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail?.trim() || null,
      clientPhone: input.clientPhone?.trim() || null,
      startsAt,
      endsAt,
      status: "confirmed",
      notes: input.notes?.trim() || null,
    })
    .returning();

  if (input.clientEmail?.trim()) {
    const ics = buildCalendarInvite({
      uid: `${appointment.id}@openbarber`,
      summary: `${appointmentType.name} — OpenBarber`,
      description: `Appointment for ${input.clientName}`,
      startsAt,
      endsAt,
      organizerEmail: getAuthEnv().adminEmails[0],
      attendeeEmail: input.clientEmail.trim(),
    });
    await emailSender.send({
      to: input.clientEmail.trim(),
      subject: `Confirmed: ${appointmentType.name}`,
      text: `Hi ${input.clientName},\n\nYour appointment is confirmed. A calendar invite is attached.\n\n— OpenBarber`,
      attachments: [
        {
          filename: "appointment.ics",
          content: ics,
          contentType: "text/calendar; charset=utf-8",
        },
      ],
    });
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  revalidatePath("/");
  return { id: appointment.id };
}

export async function loadAdminDashboard() {
  await requireAdmin();
  const pending = await db
    .select()
    .from(bookingRequests)
    .where(
      and(
        ne(bookingRequests.status, "confirmed"),
        ne(bookingRequests.status, "declined"),
        ne(bookingRequests.status, "expired"),
      ),
    )
    .orderBy(desc(bookingRequests.createdAt));

  const now = new Date();
  const upcoming = await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.status, "confirmed"), gte(appointments.startsAt, now)),
    )
    .orderBy(asc(appointments.startsAt))
    .limit(10);

  return { pending, upcoming };
}

export async function loadScheduleAdminData() {
  await requireAdmin();
  const { settings, weekly, overrides, appointmentType } =
    await getScheduleContext();
  const previewDays = listOpenDays(settings, weekly, overrides).slice(0, 21);
  return {
    settings,
    weekly: weekly.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    overrides: overrides.sort((a, b) => a.date.localeCompare(b.date)),
    appointmentType,
    previewDays,
  };
}

export async function loadRequestDetail(id: string) {
  await requireAdmin();
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, id))
    .limit(1);
  if (!request) return null;
  return { request };
}

export async function loadAppointments() {
  await requireAdmin();
  const { settings } = await getScheduleContext();
  const rows = await db
    .select({
      appointment: appointments,
      typeName: appointmentTypes.name,
    })
    .from(appointments)
    .leftJoin(
      appointmentTypes,
      eq(appointments.appointmentTypeId, appointmentTypes.id),
    )
    .orderBy(desc(appointments.startsAt));

  return { rows, timezone: settings.timezone };
}

export async function getSlotsForDateAction(date: string) {
  await requireAdmin();
  const slots = await getAvailableSlotsForDay(date);
  const { settings } = await getScheduleContext();
  return {
    slots: slots.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      label: s.label,
    })),
    timezone: settings.timezone,
  };
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  throw new Error(`Invalid time: ${value}`);
}
