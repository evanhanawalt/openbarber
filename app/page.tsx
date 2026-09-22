import { BookingDialog } from "@/components/booking-dialog";
import { getOpenBookingDays } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let openDays: string[] = [];
  try {
    openDays = await getOpenBookingDays();
  } catch {
    openDays = [];
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 70% 20%, rgba(184, 92, 56, 0.18), transparent 55%),
            linear-gradient(160deg, #faf6f0 0%, #e8d9c6 45%, #d4b896 100%),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 48px,
              rgba(61, 42, 31, 0.03) 48px,
              rgba(61, 42, 31, 0.03) 49px
            )
          `,
        }}
      />
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-copper/20 blur-3xl animate-soft-pulse" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-walnut sm:text-2xl">
            OpenBarber
          </p>
          <a
            href="/admin"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-walnut"
          >
            Admin
          </a>
        </header>

        <section className="mt-auto flex max-w-xl flex-col pb-16 pt-24 sm:pb-24 sm:pt-32">
          <h1 className="animate-fade-up font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-walnut sm:text-7xl">
            OpenBarber
          </h1>
          <div className="animate-shear mt-5 h-px w-40 bg-copper" />
          <p className="animate-fade-up-delay mt-6 max-w-md text-lg leading-relaxed text-muted sm:text-xl">
            Ask for a day. Your barber proposes times that keep the chair
            moving.
          </p>
          <div className="animate-fade-up-delay mt-10">
            <BookingDialog openDays={openDays} />
          </div>
        </section>
      </div>
    </main>
  );
}
