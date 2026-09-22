"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAvailabilityOverride,
  updateScheduleSettings,
  updateWeeklyAvailability,
  upsertAvailabilityOverride,
} from "@/lib/actions";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type WeeklyRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
};

type OverrideRow = {
  id: string;
  date: string;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

type Props = {
  settings: {
    bookingHorizonDays: number;
    timezone: string;
    slotIntervalMinutes: number;
    bufferMinutes: number;
  };
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
  previewDays: string[];
  appointmentTypeName: string;
  appointmentDuration: number;
};

export function ScheduleAdminForm({
  settings,
  weekly: initialWeekly,
  overrides,
  previewDays,
  appointmentTypeName,
  appointmentDuration,
}: Props) {
  const router = useRouter();
  const [weekly, setWeekly] = useState(
    initialWeekly.map((w) => ({
      ...w,
      startTime: w.startTime.slice(0, 5),
      endTime: w.endTime.slice(0, 5),
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted">
        Active type:{" "}
        <span className="font-medium text-walnut">
          {appointmentTypeName} ({appointmentDuration} min)
        </span>
      </p>

      {message ? (
        <p className="border border-success/30 bg-paper px-3 py-2 text-sm text-success">
          {message}
        </p>
      ) : null}

      <section className="space-y-4 border border-line bg-paper p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
          Booking window
        </h2>
        <form
          className="grid gap-4 sm:grid-cols-2"
          action={(fd) => {
            setMessage(null);
            startTransition(async () => {
              await updateScheduleSettings({
                bookingHorizonDays: Number(fd.get("horizon")),
                timezone: String(fd.get("timezone")),
                slotIntervalMinutes: Number(fd.get("interval")),
                bufferMinutes: Number(fd.get("buffer")),
              });
              setMessage("Booking window saved.");
              router.refresh();
            });
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="font-medium">Days ahead</span>
            <input
              name="horizon"
              type="number"
              min={1}
              max={180}
              defaultValue={settings.bookingHorizonDays}
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Timezone</span>
            <input
              name="timezone"
              defaultValue={settings.timezone}
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Slot interval (min)</span>
            <input
              name="interval"
              type="number"
              min={5}
              max={120}
              defaultValue={settings.slotIntervalMinutes}
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Buffer (min)</span>
            <input
              name="buffer"
              type="number"
              min={0}
              max={60}
              defaultValue={settings.bufferMinutes}
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="sm:col-span-2 w-fit bg-walnut px-4 py-2 text-sm font-semibold uppercase tracking-wider text-cream disabled:opacity-50"
          >
            Save window
          </button>
        </form>
      </section>

      <section className="space-y-4 border border-line bg-paper p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
          Weekly hours
        </h2>
        <div className="space-y-3">
          {weekly.map((row, index) => (
            <div
              key={row.id}
              className="grid items-center gap-3 border-b border-line pb-3 sm:grid-cols-[8rem_1fr_1fr_auto]"
            >
              <span className="font-medium text-walnut">
                {DAY_NAMES[row.dayOfWeek]}
              </span>
              <input
                type="time"
                value={row.startTime}
                disabled={row.isClosed}
                onChange={(e) => {
                  const next = [...weekly];
                  next[index] = { ...row, startTime: e.target.value };
                  setWeekly(next);
                }}
                className="border border-line bg-cream px-3 py-2 disabled:opacity-40"
              />
              <input
                type="time"
                value={row.endTime}
                disabled={row.isClosed}
                onChange={(e) => {
                  const next = [...weekly];
                  next[index] = { ...row, endTime: e.target.value };
                  setWeekly(next);
                }}
                className="border border-line bg-cream px-3 py-2 disabled:opacity-40"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.isClosed}
                  onChange={(e) => {
                    const next = [...weekly];
                    next[index] = { ...row, isClosed: e.target.checked };
                    setWeekly(next);
                  }}
                />
                Closed
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              await updateWeeklyAvailability(weekly);
              setMessage("Weekly hours saved.");
              router.refresh();
            });
          }}
          className="bg-walnut px-4 py-2 text-sm font-semibold uppercase tracking-wider text-cream disabled:opacity-50"
        >
          Save weekly hours
        </button>
      </section>

      <section className="space-y-4 border border-line bg-paper p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
          Date overrides
        </h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(fd) => {
            setMessage(null);
            startTransition(async () => {
              await upsertAvailabilityOverride({
                date: String(fd.get("date")),
                isClosed: fd.get("closed") === "on",
                startTime: String(fd.get("start") || "09:00"),
                endTime: String(fd.get("end") || "17:00"),
                note: String(fd.get("note") || "") || undefined,
              });
              setMessage("Override saved.");
              router.refresh();
            });
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="font-medium">Date</span>
            <input
              name="date"
              type="date"
              required
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input name="closed" type="checkbox" />
            Closed all day
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Start</span>
            <input
              name="start"
              type="time"
              defaultValue="09:00"
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">End</span>
            <input
              name="end"
              type="time"
              defaultValue="17:00"
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Note</span>
            <input
              name="note"
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-fit bg-copper px-4 py-2 text-sm font-semibold uppercase tracking-wider text-cream disabled:opacity-50"
          >
            Add / update override
          </button>
        </form>

        {overrides.length === 0 ? (
          <p className="text-sm text-muted">No overrides yet.</p>
        ) : (
          <ul className="divide-y divide-line border border-line">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>
                  {o.date}
                  {o.isClosed
                    ? " · closed"
                    : ` · ${o.startTime?.slice(0, 5)}–${o.endTime?.slice(0, 5)}`}
                  {o.note ? ` · ${o.note}` : ""}
                </span>
                <button
                  type="button"
                  className="text-copper"
                  onClick={() => {
                    startTransition(async () => {
                      await deleteAvailabilityOverride(o.id);
                      setMessage("Override removed.");
                      router.refresh();
                    });
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border border-line bg-paper p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
          Public day preview
        </h2>
        <p className="text-sm text-muted">
          Next open days clients can request (first 21 shown).
        </p>
        <div className="flex flex-wrap gap-2">
          {previewDays.map((d) => (
            <span
              key={d}
              className="border border-line bg-cream px-2.5 py-1 text-sm text-walnut"
            >
              {d}
            </span>
          ))}
          {previewDays.length === 0 ? (
            <span className="text-sm text-muted">No open days in window.</span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
