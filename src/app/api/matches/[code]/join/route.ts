import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { spawnPoint } from "@/lib/game";
import { findPlayer, getMatchByCode, log } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = (await req.json()) as { deviceId?: string; callsign?: string; team?: number };
  if (!body.deviceId || !body.callsign) {
    return NextResponse.json({ error: "deviceId and callsign required" }, { status: 400 });
  }

  const match = await getMatchByCode(code);
  if (!match) return NextResponse.json({ error: "Squad link not found" }, { status: 404 });
  if (match.status === "ended") {
    return NextResponse.json({ error: "Match already finished" }, { status: 409 });
  }

  const existing = await findPlayer(match.id, body.deviceId);
  if (existing) {
    await db
      .update(players)
      .set({ lastSeen: new Date(), callsign: body.callsign.slice(0, 14).toUpperCase() })
      .where(eq(players.id, existing.id));
    return NextResponse.json({ code: match.code, playerId: existing.id });
  }

  const roster = await db.select().from(players).where(eq(players.matchId, match.id));
  if (roster.length >= match.maxTeams * match.maxPerTeam) {
    return NextResponse.json({ error: "Match is full (4 teams × 5)" }, { status: 409 });
  }

  let team = body.team ?? 0;
  const sizeOf = (t: number) => roster.filter((p) => p.team === t).length;
  if (!team || team < 1 || team > match.maxTeams || sizeOf(team) >= match.maxPerTeam) {
    const open = [1, 2, 3, 4]
      .slice(0, match.maxTeams)
      .filter((t) => sizeOf(t) < match.maxPerTeam)
      .sort((a, b) => sizeOf(a) - sizeOf(b));
    if (!open.length) {
      return NextResponse.json({ error: "All teams are full" }, { status: 409 });
    }
    team = open[0];
  }

  const spawn = spawnPoint(team, match.arenaSize, sizeOf(team));
  const created = await db
    .insert(players)
    .values({
      matchId: match.id,
      deviceId: body.deviceId,
      callsign: body.callsign.slice(0, 14).toUpperCase(),
      team,
      x: spawn.x,
      y: spawn.y,
    })
    .returning();

  await log(match.id, "join", `${created[0].callsign} linked over Wi-Fi Direct`, team);
  return NextResponse.json({ code: match.code, playerId: created[0].id });
}
