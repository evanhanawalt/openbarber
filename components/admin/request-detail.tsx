"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { declineBookingRequest } from "@/lib/actions";

type Props = {
  request: {
    id: string;
    clientName: string;
    clientEmail: string | null;
    clientPhone: string | null;
    requestedDate: string;
    status: string;
    notes: string | null;
  };
};

export function RequestDetailClient({ request }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOpen = !["confirmed", "declined", "expired"].includes(request.status);

  return (
    <div className="space-y-6">
      <div className="border border-line bg-paper p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">
          {request.status}
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-walnut sm:text-4xl">
          {request.clientName}
        </h2>
        <p className="mt-2 text-muted">
          Requested{" "}
          <span className="font-medium text-walnut">
            {formatDay(request.requestedDate)}
          </span>
        </p>

        <dl className="mt-8 space-y-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Phone
            </dt>
            <dd className="mt-1 text-lg text-walnut">
              {request.clientPhone ? (
                <a
                  href={`tel:${request.clientPhone}`}
                  className="underline decoration-copper/40 underline-offset-4 hover:decoration-copper"
                >
                  {request.clientPhone}
                </a>
              ) : (
                <span className="text-muted">Not provided</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Email
            </dt>
            <dd className="mt-1 text-lg text-walnut">
              {request.clientEmail ? (
                <a
                  href={`mailto:${request.clientEmail}`}
                  className="underline decoration-copper/40 underline-offset-4 hover:decoration-copper"
                >
                  {request.clientEmail}
                </a>
              ) : (
                <span className="text-muted">Not provided</span>
              )}
            </dd>
          </div>
          {request.notes ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Notes
              </dt>
              <dd className="mt-1 text-walnut">{request.notes}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-8 text-sm text-muted">
          Reach out by phone or email to set a time, then add it under{" "}
          <Link href="/admin/appointments" className="text-copper hover:underline">
            Appointments
          </Link>
          .
        </p>
      </div>

      {message ? (
        <p className="border border-success/30 bg-paper px-3 py-2 text-sm text-success">
          {message}
        </p>
      ) : null}

      {isOpen ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await declineBookingRequest(request.id);
              setMessage("Request declined.");
              router.refresh();
            });
          }}
          className="border border-line px-4 py-2 text-sm text-muted hover:border-copper hover:text-copper disabled:opacity-50"
        >
          Decline request
        </button>
      ) : null}
    </div>
  );
}

function formatDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
