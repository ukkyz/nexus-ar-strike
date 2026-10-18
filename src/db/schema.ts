import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    hotspotSsid: text("hotspot_ssid").notNull().default("AR-STRIKE-LAN"),
    hostIp: text("host_ip").notNull().default("192.168.43.1"),
    splatScene: text("splat_scene").notNull().default("warehouse"),
    status: text("status").notNull().default("lobby"), // lobby | live | ended
    arenaSize: integer("arena_size").notNull().default(60), // meters (square)
    maxTeams: integer("max_teams").notNull().default(4),
    maxPerTeam: integer("max_per_team").notNull().default(5),
    scoreLimit: integer("score_limit").notNull().default(30),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("matches_code_idx").on(t.code)],
);

export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id").notNull(),
    deviceId: text("device_id").notNull(),
    callsign: text("callsign").notNull(),
    team: integer("team").notNull().default(1),
    isHost: integer("is_host", { mode: "boolean" }).notNull().default(false),
    ready: integer("ready", { mode: "boolean" }).notNull().default(false),
    hp: integer("hp").notNull().default(100),
    ammo: integer("ammo").notNull().default(30),
    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    score: integer("score").notNull().default(0),
    alive: integer("alive", { mode: "boolean" }).notNull().default(true),
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    heading: real("heading").notNull().default(0),
    respawnAt: integer("respawn_at", { mode: "timestamp_ms" }),
    lastSeen: integer("last_seen", { mode: "timestamp_ms" }).notNull().defaultNow(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (t) => [
    index("players_match_idx").on(t.matchId),
    uniqueIndex("players_match_device_idx").on(t.matchId, t.deviceId),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id").notNull(),
    kind: text("kind").notNull(), // join | start | hit | kill | respawn | end | scan
    message: text("message").notNull(),
    team: integer("team"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (t) => [index("events_match_idx").on(t.matchId)],
);

// Progressive auto-track minimap: each visited grid cell is persisted so the
// fog-of-war map builds itself up as squads sweep the real-world arena.
export const mapNodes = sqliteTable(
  "map_nodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id").notNull(),
    gx: integer("gx").notNull(),
    gy: integer("gy").notNull(),
    team: integer("team").notNull(),
    splatDensity: real("splat_density").notNull().default(0.4),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (t) => [
    index("map_nodes_match_idx").on(t.matchId),
    uniqueIndex("map_nodes_cell_idx").on(t.matchId, t.gx, t.gy),
  ],
);
