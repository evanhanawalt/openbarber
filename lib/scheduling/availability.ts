import {
  addDays,
  addMinutes,
  format,
  parse,
  startOfDay,
  isBefore,
  isAfter,
  areIntervalsOverlapping,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  appointmentTypes,
  availabilityOverrides,
  scheduleSettings,
  weeklyAvailability,
  type AppointmentType,
  type AvailabilityOverride,
  type ScheduleSettings,
  type WeeklyAvailability,
} from "@/lib/db/schema";

export type DayWindow = {
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string;
  isOpen: boolean;
};

export type TimeSlot = {
  startsAt: Date;
  endsAt: Date;
  label: string;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function getScheduleContext() {
  const [settings] = await db.select().from(scheduleSettings).limit(1);
  if (!settings) {
    throw new Error("Schedule settings not configured. Run db:seed.");
  }

  const weekly = await db.select().from(weeklyAvailability);
  const overrides = await db.select().from(availabilityOverrides);
  const [appointmentType] = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.active, true))
    .limit(1);

  if (!appointmentType) {
    throw new Error("No active appointment type. Run db:seed.");
  }

  return { settings, weekly, overrides, appointmentType };
}

export function resolveDayWindow(
  dateStr: string,
  weekly: WeeklyAvailability[],
  overrides: AvailabilityOverride[],
): DayWindow {
  const override = overrides.find((o) => o.date === dateStr);
  if (override) {
    if (override.isClosed) {
      return {
        date: dateStr,
        startTime: "00:00",
        endTime: "00:00",
        isOpen: false,
      };
    }
    if (override.startTime && override.endTime) {
      return {
        date: dateStr,
        startTime: override.startTime.slice(0, 5),
        endTime: override.endTime.slice(0, 5),
        isOpen: true,
      };
    }
  }

  const dayOfWeek = parse(dateStr, "yyyy-MM-dd", new Date()).getDay();
  const template = weekly.find((w) => w.dayOfWeek === dayOfWeek);
  if (!template || template.isClosed) {
    return {
      date: dateStr,
      startTime: "00:00",
      endTime: "00:00",
      isOpen: false,
    };
  }

  return {
    date: dateStr,
    startTime: template.startTime.slice(0, 5),
    endTime: template.endTime.slice(0, 5),
    isOpen: true,
  };
}

export function listOpenDays(
  settings: ScheduleSettings,
  weekly: WeeklyAvailability[],
  overrides: AvailabilityOverride[],
  fromDate = new Date(),
): string[] {
  const tz = settings.timezone;
  const todayInTz = toZonedTime(fromDate, tz);
  const start = startOfDay(todayInTz);
  const openDays: string[] = [];

  for (let i = 0; i <= settings.bookingHorizonDays; i++) {
    const day = addDays(start, i);
    const dateStr = format(day, "yyyy-MM-dd");
    const window = resolveDayWindow(dateStr, weekly, overrides);
    if (window.isOpen) {
      openDays.push(dateStr);
    }
  }

  return openDays;
}

export async function getBookedIntervals(
  dateStr: string,
  timezone: string,
): Promise<{ start: Date; end: Date }[]> {
  const dayStartLocal = fromZonedTime(`${dateStr}T00:00:00`, timezone);
  const dayEndLocal = fromZonedTime(`${dateStr}T23:59:59.999`, timezone);

  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        ne(appointments.status, "cancelled"),
        gte(appointments.startsAt, dayStartLocal),
        lt(appointments.startsAt, dayEndLocal),
      ),
    );

  return rows.map((row) => ({
    start: row.startsAt,
    end: row.endsAt,
  }));
}

export async function getAvailableSlotsForDay(
  dateStr: string,
  options?: {
    settings?: ScheduleSettings;
    weekly?: WeeklyAvailability[];
    overrides?: AvailabilityOverride[];
    appointmentType?: AppointmentType;
  },
): Promise<TimeSlot[]> {
  const ctx = options?.settings
    ? {
        settings: options.settings,
        weekly: options.weekly!,
        overrides: options.overrides!,
        appointmentType: options.appointmentType!,
      }
    : await getScheduleContext();

  const window = resolveDayWindow(dateStr, ctx.weekly, ctx.overrides);
  if (!window.isOpen) return [];

  const booked = await getBookedIntervals(dateStr, ctx.settings.timezone);
  const duration = ctx.appointmentType.durationMinutes;
  const interval = ctx.settings.slotIntervalMinutes;
  const buffer = ctx.settings.bufferMinutes;
  const tz = ctx.settings.timezone;

  const startMin = timeToMinutes(window.startTime);
  const endMin = timeToMinutes(window.endTime);
  const slots: TimeSlot[] = [];
  const now = new Date();

  for (let m = startMin; m + duration <= endMin; m += interval) {
    const startLabel = minutesToTime(m);
    const endLabel = minutesToTime(m + duration);
    const startsAt = fromZonedTime(`${dateStr}T${startLabel}:00`, tz);
    const endsAt = fromZonedTime(`${dateStr}T${endLabel}:00`, tz);

    if (isBefore(startsAt, now)) continue;

    const padded = {
      start: addMinutes(startsAt, -buffer),
      end: addMinutes(endsAt, buffer),
    };

    const conflicts = booked.some((b) =>
      areIntervalsOverlapping(padded, b, { inclusive: false }),
    );
    if (conflicts) continue;

    slots.push({
      startsAt,
      endsAt,
      label: startLabel,
    });
  }

  return slots;
}

export function isDateWithinHorizon(
  dateStr: string,
  settings: ScheduleSettings,
): boolean {
  const tz = settings.timezone;
  const today = startOfDay(toZonedTime(new Date(), tz));
  const target = startOfDay(parse(dateStr, "yyyy-MM-dd", new Date()));
  if (isBefore(target, today)) return false;
  if (isAfter(target, addDays(today, settings.bookingHorizonDays))) {
    return false;
  }
  return true;
}
