import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mapNodes, players } from "@/db/schema";
import { CELL_SIZE } from "@/lib/game";
import { buildState, findPlayer, getMatchByCode, log } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = (await req.json()) as {
    deviceId?: string;
    x?: number;
    y?: number;
    heading?: number;
  };

  const match = await getMatchByCode(code);
  if (!match) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.deviceId) {
    const me = await findPlayer(match.id, body.deviceId);
    if (me) {
      const x = clamp(body.x ?? me.x, 0, match.arenaSize);
      const y = clamp(body.y ?? me.y, 0, match.arenaSize);
      const heading = ((body.heading ?? me.heading) % 360 + 360) % 360;

      const patch: Record<string, unknown> = { x, y, heading, lastSeen: new Date() };

      // auto respawn
      if (!me.alive && me.respawnAt && me.respawnAt.getTime() <= Date.now()) {
        patch.alive = true;
        patch.hp = 100;
        patch.ammo = 30;
        patch.respawnAt = null;
        await log(match.id, "respawn", `${me.callsign} redeployed`, me.team);
      }

      await db.update(players).set(patch).where(eq(players.id, me.id));

      // progressive auto-track minimap: persist the swept cell
      if (match.status === "live" || match.status === "lobby") {
        const gx = Math.floor(x / CELL_SIZE);
        const gy = Math.floor(y / CELL_SIZE);
        await db
          .insert(mapNodes)
          .values({
            matchId: match.id,
            gx,
            gy,
            team: me.team,
            splatDensity: Math.round((0.25 + Math.random() * 0.75) * 100) / 100,
          })
          .onConflictDoUpdate({
            target: [mapNodes.matchId, mapNodes.gx, mapNodes.gy],
            set: { team: me.team },
          });
      }
    }
  }

  // auto-end when a team reaches the score limit
  if (match.status === "live") {
    const roster = await db.select().from(players).where(eq(players.matchId, match.id));
    for (const team of [1, 2, 3, 4]) {
      const total = roster.filter((p) => p.team === team).reduce((s, p) => s + p.score, 0);
      if (total >= match.scoreLimit) {
        await db.execute(
          sql`update matches set status = 'ended', ended_at = now() where id = ${match.id}`,
        );
        await log(match.id, "end", `Team ${team} secured the sector`, team);
        break;
      }
    }
  }

  const state = await buildState(match.id);
  return NextResponse.json(state);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
