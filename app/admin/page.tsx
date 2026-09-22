import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { loadAdminDashboard } from "@/lib/actions";
import { getScheduleContext } from "@/lib/scheduling/availability";

export default async function AdminDashboardPage() {
  const [{ pending, upcoming }, { settings }] = await Promise.all([
    loadAdminDashboard(),
    getScheduleContext(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-walnut">
          Dashboard
        </h1>
        <p className="mt-2 text-muted">
          Pending day requests and upcoming appointments.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
            Open requests
          </h2>
          <Link href="/admin/requests" className="text-sm text-copper">
            View all
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-muted">No open requests.</p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-paper">
            {pending.map((req) => (
              <li key={req.id}>
                <Link
                  href={`/admin/requests/${req.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-cream"
                >
                  <div>
                    <p className="font-medium text-walnut">{req.clientName}</p>
                    <p className="text-sm text-muted">
                      Requested {req.requestedDate} · {req.status}
                    </p>
                  </div>
                  <span className="text-sm text-copper">Contact →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
            Upcoming
          </h2>
          <Link href="/admin/appointments" className="text-sm text-copper">
            Manage
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-muted">No upcoming appointments.</p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-paper">
            {upcoming.map((appt) => (
              <li
                key={appt.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-walnut">{appt.clientName}</p>
                  <p className="text-sm text-muted">
                    {formatInTimeZone(
                      appt.startsAt,
                      settings.timezone,
                      "EEE MMM d · h:mm a",
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
