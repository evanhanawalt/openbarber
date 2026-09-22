# OpenBarber

Barber-controlled scheduling: clients request a day; the admin proposes times and confirms appointments.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Neon Postgres + Drizzle ORM
- Auth.js (Google OAuth, `ADMIN_EMAIL` allowlist)

## Setup

1. Ensure `.env` has `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_*`, and `ADMIN_EMAIL`.
2. Install and prepare the database:

```bash
npm install
npm run db:push
npm run db:seed
```

3. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: `/admin` (Google sign-in).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:push` | Push schema (uses unpooled URL) |
| `npm run db:seed` | Seed Haircut type + default hours |
| `npm run db:studio` | Drizzle Studio |

Email/SMS and calendar invites log to the server console until real providers are wired.
