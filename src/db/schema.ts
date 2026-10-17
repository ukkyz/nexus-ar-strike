import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
  },
  (t) => [uniqueIndex("matches_code_idx").on(t.code)],
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").notNull(),
    deviceId: text("device_id").notNull(),
    callsign: text("callsign").notNull(),
    team: integer("team").notNull().default(1),
    isHost: boolean("is_host").notNull().default(false),
    ready: boolean("ready").notNull().default(false),
    hp: integer("hp").notNull().default(100),
    ammo: integer("ammo").notNull().default(30),
    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    score: integer("score").notNull().default(0),
    alive: boolean("alive").notNull().default(true),
    x: doublePrecision("x").notNull().default(0),
    y: doublePrecision("y").notNull().default(0),
    heading: doublePrecision("heading").notNull().default(0),
    respawnAt: timestamp("respawn_at"),
    lastSeen: timestamp("last_seen").notNull().defaultNow(),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    index("players_match_idx").on(t.matchId),
    uniqueIndex("players_match_device_idx").on(t.matchId, t.deviceId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").notNull(),
    kind: text("kind").notNull(), // join | start | hit | kill | respawn | end | scan
    message: text("message").notNull(),
    team: integer("team"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_match_idx").on(t.matchId)],
);

// Progressive auto-track minimap: each visited grid cell is persisted so the
// fog-of-war map builds itself up as squads sweep the real-world arena.
export const mapNodes = pgTable(
  "map_nodes",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").notNull(),
    gx: integer("gx").notNull(),
    gy: integer("gy").notNull(),
    team: integer("team").notNull(),
    splatDensity: doublePrecision("splat_density").notNull().default(0.4),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("map_nodes_match_idx").on(t.matchId),
    uniqueIndex("map_nodes_cell_idx").on(t.matchId, t.gx, t.gy),
  ],
);
