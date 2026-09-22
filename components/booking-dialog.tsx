"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createBookingRequest } from "@/lib/actions";

type Props = {
  openDays: string[];
};

export function BookingDialog({ openDays }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createBookingRequest({
          clientName: String(formData.get("name") || ""),
          clientEmail: String(formData.get("email") || "") || undefined,
          clientPhone: String(formData.get("phone") || "") || undefined,
          requestedDate: String(formData.get("date") || ""),
          notes: String(formData.get("notes") || "") || undefined,
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-walnut/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="animate-fade-up max-h-[min(90vh,40rem)] w-full max-w-md overflow-y-auto border border-line bg-cream p-6 shadow-xl sm:p-8">
              {done ? (
                <div className="space-y-4">
                  <h2
                    id="booking-title"
                    className="font-[family-name:var(--font-display)] text-3xl text-walnut"
                  >
                    Request received
                  </h2>
                  <p className="text-muted">
                    The barber will follow up with times that fit the day you
                    asked for.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="bg-walnut px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-cream"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form action={onSubmit} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
                      Booking
                    </p>
                    <h2
                      id="booking-title"
                      className="mt-1 font-[family-name:var(--font-display)] text-3xl text-walnut"
                    >
                      Pick a day
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      Choose an open day. Times come from the barber after you
                      request.
                    </p>
                  </div>

                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-walnut">Name</span>
                    <input
                      name="name"
                      required
                      className="w-full border border-line bg-paper px-3 py-2 outline-none focus:border-copper"
                    />
                  </label>

                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-walnut">Email</span>
                    <input
                      name="email"
                      type="email"
                      className="w-full border border-line bg-paper px-3 py-2 outline-none focus:border-copper"
                    />
                  </label>

                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-walnut">Phone</span>
                    <input
                      name="phone"
                      type="tel"
                      className="w-full border border-line bg-paper px-3 py-2 outline-none focus:border-copper"
                    />
                  </label>

                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-walnut">Day</span>
                    <select
                      name="date"
                      required
                      className="w-full border border-line bg-paper px-3 py-2 outline-none focus:border-copper"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {openDays.length ? "Select a day" : "No open days"}
                      </option>
                      {openDays.map((day) => (
                        <option key={day} value={day}>
                          {formatDay(day)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-walnut">Notes</span>
                    <textarea
                      name="notes"
                      rows={2}
                      className="w-full border border-line bg-paper px-3 py-2 outline-none focus:border-copper"
                    />
                  </label>

                  {error ? (
                    <p className="text-sm text-copper-deep">{error}</p>
                  ) : null}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={pending || openDays.length === 0}
                      className="bg-copper px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-cream disabled:opacity-50"
                    >
                      {pending ? "Sending…" : "Request day"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-5 py-2.5 text-sm font-medium text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError(null);
        }}
        className="inline-flex items-center justify-center bg-copper px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-cream transition hover:bg-copper-deep"
      >
        Request a day
      </button>
      {dialog}
    </>
  );
}

function formatDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
