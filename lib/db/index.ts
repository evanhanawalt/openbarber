import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getPostgresEnv } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  const { databaseUrl } = getPostgresEnv();
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

const globalForDb = globalThis as unknown as {
  __openbarberDb?: ReturnType<typeof createDb>;
};

export const db = globalForDb.__openbarberDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__openbarberDb = db;
}

export type Db = typeof db;
