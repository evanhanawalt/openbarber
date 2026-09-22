"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment, createManualAppointment } from "@/lib/actions";

type Row = {
  id: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  typeName: string | null;
};

type Props = {
  rows: Row[];
  timezone: string;
};

export function AppointmentsAdmin({ rows, timezone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {message ? (
        <p className="border border-success/30 bg-paper px-3 py-2 text-sm text-success">
          {message}
        </p>
      ) : null}

      <section className="space-y-4 border border-line bg-paper p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
          Create appointment
        </h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(fd) => {
            setMessage(null);
            startTransition(async () => {
              const local = String(fd.get("datetime"));
              const startsAt = new Date(local).toISOString();
              await createManualAppointment({
                clientName: String(fd.get("name")),
                clientEmail: String(fd.get("email") || "") || undefined,
                clientPhone: String(fd.get("phone") || "") || undefined,
                startsAt,
                notes: String(fd.get("notes") || "") || undefined,
              });
              setMessage("Appointment created.");
              router.refresh();
            });
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="font-medium">Client name</span>
            <input
              name="name"
              required
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Start (local)</span>
            <input
              name="datetime"
              type="datetime-local"
              required
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              name="email"
              type="email"
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Phone</span>
            <input
              name="phone"
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Notes</span>
            <input
              name="notes"
              className="w-full border border-line bg-cream px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-fit bg-walnut px-4 py-2 text-sm font-semibold uppercase tracking-wider text-cream disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
          All appointments
        </h2>
        {rows.length === 0 ? (
          <p className="text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-paper">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-walnut">
                    {row.clientName}{" "}
                    <span className="text-sm font-normal text-muted">
                      · {row.typeName ?? "Appointment"} · {row.status}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(row.startsAt).toLocaleString(undefined, {
                      timeZone: timezone,
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {row.status === "confirmed" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await cancelAppointment(row.id);
                        setMessage("Appointment cancelled.");
                        router.refresh();
                      });
                    }}
                    className="text-sm text-copper"
                  >
                    Cancel
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
