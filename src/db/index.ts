import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

// File-backed SQLite: zero-config persistence that runs entirely on the
// host device, so matches keep working on an offline Wi-Fi hotspot with
// no external database server. Point SQLITE_FILE at another path to
// relocate the database file.
const dbFile = process.env.SQLITE_FILE ?? "nexus-ar-strike.db";

mkdirSync(dirname(dbFile), { recursive: true });

const globalForDb = globalThis as typeof globalThis & {
  __nexusArStrikeSqlite?: Database.Database;
};

export const client =
  globalForDb.__nexusArStrikeSqlite ?? new Database(dbFile);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__nexusArStrikeSqlite = client;
}

// WAL keeps reads (state polling) fast while the host writes ticks/actions.
client.pragma("journal_mode = WAL");

export const db = drizzle(client, { schema });

// Auto-apply pending Drizzle migrations on boot (idempotent — tracked in
// the __drizzle_migrations journal table), so a fresh checkout or a
// reinstalled PWA host needs no manual database setup.
migrate(db, { migrationsFolder: "./drizzle" });
