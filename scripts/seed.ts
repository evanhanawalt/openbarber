import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count } from "drizzle-orm";
import {
  appointmentTypes,
  scheduleSettings,
  weeklyAvailability,
} from "../lib/db/schema";

async function seed() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
  }

  const sql = neon(url);
  const db = drizzle(sql);

  const [{ value: typeCount }] = await db
    .select({ value: count() })
    .from(appointmentTypes);

  if (typeCount === 0) {
    await db.insert(appointmentTypes).values({
      name: "Haircut",
      durationMinutes: 45,
      active: true,
    });
    console.log("Seeded appointment type: Haircut (45 min)");
  } else {
    console.log("Appointment types already present, skipping");
  }

  const [{ value: settingsCount }] = await db
    .select({ value: count() })
    .from(scheduleSettings);

  if (settingsCount === 0) {
    await db.insert(scheduleSettings).values({
      bookingHorizonDays: 30,
      timezone: "America/New_York",
      slotIntervalMinutes: 30,
      bufferMinutes: 0,
    });
    console.log("Seeded schedule settings");
  } else {
    console.log("Schedule settings already present, skipping");
  }

  const [{ value: weeklyCount }] = await db
    .select({ value: count() })
    .from(weeklyAvailability);

  if (weeklyCount === 0) {
    // Default: closed Sun/Mon, open Tue–Sat 9:00–17:00
    const rows = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const isClosed = dayOfWeek === 0 || dayOfWeek === 1;
      return {
        dayOfWeek,
        startTime: "09:00:00",
        endTime: "17:00:00",
        isClosed,
      };
    });
    await db.insert(weeklyAvailability).values(rows);
    console.log("Seeded weekly availability (Tue–Sat 9–5)");
  } else {
    console.log("Weekly availability already present, skipping");
  }
}

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
