import { NextResponse } from "next/server";
import { desc, ne } from "drizzle-orm";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { makeCode, spawnPoint } from "@/lib/game";
import { log } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(matches)
    .where(ne(matches.status, "ended"))
    .orderBy(desc(matches.id))
    .limit(20);

  const counts = await db.select().from(players);
  return NextResponse.json({
    lobbies: rows.map((m) => ({
      code: m.code,
      name: m.name,
      hotspotSsid: m.hotspotSsid,
      hostIp: m.hostIp,
      status: m.status,
      splatScene: m.splatScene,
      players: counts.filter((p) => p.matchId === m.id).length,
      capacity: m.maxTeams * m.maxPerTeam,
    })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    callsign?: string;
    deviceId?: string;
    hotspotSsid?: string;
    splatScene?: string;
    arenaSize?: number;
    scoreLimit?: number;
  };

  if (!body.deviceId || !body.callsign) {
    return NextResponse.json({ error: "deviceId and callsign required" }, { status: 400 });
  }

  const code = makeCode();
  const arenaSize = Math.min(160, Math.max(30, body.arenaSize ?? 60));

  const inserted = await db
    .insert(matches)
    .values({
      code,
      name: body.name?.trim() || "AR Strike Op",
      hotspotSsid: body.hotspotSsid?.trim() || "AR-STRIKE-LAN",
      hostIp: "192.168.43.1",
      splatScene: body.splatScene || "warehouse",
      arenaSize,
      scoreLimit: Math.min(100, Math.max(5, body.scoreLimit ?? 30)),
    })
    .returning();

  const match = inserted[0];
  const spawn = spawnPoint(1, arenaSize, 0);

  await db.insert(players).values({
    matchId: match.id,
    deviceId: body.deviceId,
    callsign: body.callsign.slice(0, 14).toUpperCase(),
    team: 1,
    isHost: true,
    x: spawn.x,
    y: spawn.y,
  });

  await log(match.id, "join", `${body.callsign.toUpperCase()} opened hotspot ${match.hotspotSsid}`, 1);

  return NextResponse.json({ code: match.code });
}
