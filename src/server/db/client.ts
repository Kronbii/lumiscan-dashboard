import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "@/server/db/schema";

const globalForDb = globalThis as typeof globalThis & {
  lumiscanPostgres?: postgres.Sql;
};

const client =
  globalForDb.lumiscanPostgres ??
  postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.lumiscanPostgres = client;
}

export const db = drizzle(client, { schema });
export const sql = client;
export type Db = typeof db;
