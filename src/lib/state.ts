import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, mapNodes, matches, players } from "@/db/schema";
import type { MatchState } from "@/lib/game";

export async function getMatchByCode(code: string) {
  const rows = await db
    .select()
    .from(matches)
    .where(eq(matches.code, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function log(matchId: number, kind: string, message: string, team?: number | null) {
  await db.insert(events).values({ matchId, kind, message, team: team ?? null });
}

export async function buildState(matchId: number): Promise<MatchState | null> {
  const matchRows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  const match = matchRows[0];
  if (!match) return null;

  const [roster, nodes, feed] = await Promise.all([
    db.select().from(players).where(eq(players.matchId, matchId)).orderBy(asc(players.joinedAt)),
    db.select().from(mapNodes).where(eq(mapNodes.matchId, matchId)),
    db.select().from(events).where(eq(events.matchId, matchId)).orderBy(desc(events.id)).limit(18),
  ]);

  const now = Date.now();
  const teamScores = [1, 2, 3, 4].map((team) => {
    const members = roster.filter((p) => p.team === team);
    return {
      team,
      score: members.reduce((s, p) => s + p.score, 0),
      kills: members.reduce((s, p) => s + p.kills, 0),
      players: members.length,
    };
  });

  return {
    match: {
      id: match.id,
      code: match.code,
      name: match.name,
      hotspotSsid: match.hotspotSsid,
      hostIp: match.hostIp,
      splatScene: match.splatScene,
      status: match.status,
      arenaSize: match.arenaSize,
      maxTeams: match.maxTeams,
      maxPerTeam: match.maxPerTeam,
      scoreLimit: match.scoreLimit,
    },
    players: roster.map((p) => ({
      id: p.id,
      callsign: p.callsign,
      team: p.team,
      hp: p.hp,
      ammo: p.ammo,
      kills: p.kills,
      deaths: p.deaths,
      score: p.score,
      alive: p.alive,
      isHost: p.isHost,
      ready: p.ready,
      x: p.x,
      y: p.y,
      heading: p.heading,
      respawnAt: p.respawnAt ? p.respawnAt.toISOString() : null,
      online: now - new Date(p.lastSeen).getTime() < 15000,
    })),
    teamScores,
    nodes: nodes.map((n) => ({
      gx: n.gx,
      gy: n.gy,
      team: n.team,
      splatDensity: n.splatDensity,
    })),
    events: feed.map((e) => ({
      id: e.id,
      kind: e.kind,
      message: e.message,
      team: e.team,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function findPlayer(matchId: number, deviceId: string) {
  const rows = await db
    .select()
    .from(players)
    .where(and(eq(players.matchId, matchId), eq(players.deviceId, deviceId)))
    .limit(1);
  return rows[0] ?? null;
}
