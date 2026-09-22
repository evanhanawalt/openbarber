import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingRequests } from "@/lib/db/schema";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const rows = await db
    .select()
    .from(bookingRequests)
    .orderBy(desc(bookingRequests.createdAt));

  const open = rows.filter(
    (r) => !["confirmed", "declined", "expired"].includes(r.status),
  );
  const closed = rows.filter((r) =>
    ["confirmed", "declined", "expired"].includes(r.status),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-walnut">
          Requests
        </h1>
        <p className="mt-2 text-muted">
          Day requests — contact the client to set a time.
        </p>
      </div>

      <RequestList title="Open" rows={open} />
      <RequestList title="Closed" rows={closed} />
    </div>
  );
}

function RequestList({
  title,
  rows,
}: {
  title: string;
  rows: (typeof bookingRequests.$inferSelect)[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-walnut">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted">None.</p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {rows.map((req) => (
            <li key={req.id}>
              <Link
                href={`/admin/requests/${req.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-cream"
              >
                <div>
                  <p className="font-medium text-walnut">{req.clientName}</p>
                  <p className="text-sm text-muted">
                    {req.requestedDate} · {req.status}
                  </p>
                </div>
                <span className="text-sm text-copper">Contact →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
