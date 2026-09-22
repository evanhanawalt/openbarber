import Link from "next/link";
import { auth, signOut } from "@/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/appointments", label: "Appointments" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-cream text-ink">
      {session ? (
        <header className="border-b border-line bg-paper/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-6">
              <Link
                href="/admin"
                className="font-[family-name:var(--font-display)] text-xl text-walnut"
              >
                OpenBarber
              </Link>
              <nav className="flex flex-wrap gap-4 text-sm font-medium text-muted">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="hover:text-walnut"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="hidden sm:inline">{session.user?.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="border border-line px-3 py-1.5 hover:border-walnut hover:text-walnut"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
      ) : null}
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
