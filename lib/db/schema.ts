import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const bookingRequestStatusEnum = pgEnum("booking_request_status", [
  "pending",
  "offered",
  "confirmed",
  "declined",
  "expired",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "confirmed",
  "cancelled",
  "completed",
]);

export const appointmentTypes = pgTable("appointment_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scheduleSettings = pgTable("schedule_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingHorizonDays: integer("booking_horizon_days").notNull().default(30),
  timezone: text("timezone").notNull().default("America/New_York"),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const weeklyAvailability = pgTable("weekly_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isClosed: boolean("is_closed").notNull().default(false),
});

export const availabilityOverrides = pgTable("availability_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  isClosed: boolean("is_closed").notNull().default(false),
  startTime: time("start_time"),
  endTime: time("end_time"),
  note: text("note"),
});

export const bookingRequests = pgTable("booking_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  requestedDate: date("requested_date").notNull(),
  status: bookingRequestStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  appointmentTypeId: uuid("appointment_type_id").references(
    () => appointmentTypes.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const slotOffers = pgTable("slot_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingRequestId: uuid("booking_request_id")
    .notNull()
    .references(() => bookingRequests.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentTypeId: uuid("appointment_type_id")
    .notNull()
    .references(() => appointmentTypes.id),
  bookingRequestId: uuid("booking_request_id").references(
    () => bookingRequests.id,
  ),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: appointmentStatusEnum("status").notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppointmentType = typeof appointmentTypes.$inferSelect;
export type ScheduleSettings = typeof scheduleSettings.$inferSelect;
export type WeeklyAvailability = typeof weeklyAvailability.$inferSelect;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type BookingRequest = typeof bookingRequests.$inferSelect;
export type SlotOffer = typeof slotOffers.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
