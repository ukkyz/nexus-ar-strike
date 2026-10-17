import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import {
  DAMAGE,
  FIRE_CONE,
  FIRE_RANGE,
  MAG_SIZE,
  RESPAWN_MS,
  angleDiff,
  bearing,
  dist,
  spawnPoint,
} from "@/lib/game";
import { buildState, findPlayer, getMatchByCode, log } from "@/lib/state";

export const dynamic = "force-dynamic";

type Body = {
  deviceId?: string;
  action?: "fire" | "reload" | "ready" | "start" | "team" | "leave" | "end" | "scene";
  team?: number;
  scene?: string;
};

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = (await req.json()) as Body;
  const match = await getMatchByCode(code);
  if (!match) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!body.deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  const me = await findPlayer(match.id, body.deviceId);
  if (!me) return NextResponse.json({ error: "player not in match" }, { status: 404 });

  let result: Record<string, unknown> = { ok: true };

  switch (body.action) {
    case "ready": {
      await db.update(players).set({ ready: !me.ready }).where(eq(players.id, me.id));
      break;
    }
    case "team": {
      const target = Math.min(match.maxTeams, Math.max(1, body.team ?? me.team));
      const roster = await db.select().from(players).where(eq(players.matchId, match.id));
      const size = roster.filter((p) => p.team === target && p.id !== me.id).length;
      if (size >= match.maxPerTeam) {
        return NextResponse.json({ error: "Team is full (5 max)" }, { status: 409 });
      }
      const spawn = spawnPoint(target, match.arenaSize, size);
      await db
        .update(players)
        .set({ team: target, x: spawn.x, y: spawn.y })
        .where(eq(players.id, me.id));
      break;
    }
    case "scene": {
      if (!me.isHost) return NextResponse.json({ error: "host only" }, { status: 403 });
      await db
        .update(matches)
        .set({ splatScene: body.scene || match.splatScene })
        .where(eq(matches.id, match.id));
      break;
    }
    case "start": {
      if (!me.isHost) return NextResponse.json({ error: "host only" }, { status: 403 });
      await db
        .update(matches)
        .set({ status: "live", startedAt: new Date() })
        .where(eq(matches.id, match.id));
      await db
        .update(players)
        .set({ hp: 100, ammo: MAG_SIZE, alive: true, kills: 0, deaths: 0, score: 0 })
        .where(eq(players.matchId, match.id));
      await log(match.id, "start", `Mission live · ${match.splatScene} splat scene streaming`);
      break;
    }
    case "end": {
      if (!me.isHost) return NextResponse.json({ error: "host only" }, { status: 403 });
      await db
        .update(matches)
        .set({ status: "ended", endedAt: new Date() })
        .where(eq(matches.id, match.id));
      await log(match.id, "end", "Host terminated the operation");
      break;
    }
    case "leave": {
      await db.delete(players).where(eq(players.id, me.id));
      await log(match.id, "join", `${me.callsign} dropped from the LAN`, me.team);
      break;
    }
    case "reload": {
      await db.update(players).set({ ammo: MAG_SIZE }).where(eq(players.id, me.id));
      break;
    }
    case "fire": {
      if (match.status !== "live") {
        return NextResponse.json({ error: "match not live" }, { status: 409 });
      }
      if (!me.alive) return NextResponse.json({ error: "down" }, { status: 409 });
      if (me.ammo <= 0) return NextResponse.json({ ok: true, dry: true });

      const roster = await db.select().from(players).where(eq(players.matchId, match.id));
      const candidates = roster
        .filter((p) => p.id !== me.id && p.team !== me.team && p.alive)
        .map((p) => ({
          p,
          d: dist(me.x, me.y, p.x, p.y),
          off: angleDiff(bearing(me.x, me.y, p.x, p.y), me.heading),
        }))
        .filter((c) => c.d <= FIRE_RANGE && c.off <= FIRE_CONE)
        .sort((a, b) => a.off * 2 + a.d - (b.off * 2 + b.d));

      const ammo = me.ammo - 1;
      await db.update(players).set({ ammo }).where(eq(players.id, me.id));

      const target = candidates[0];
      if (!target) {
        result = { ok: true, hit: false, ammo };
        break;
      }

      const falloff = 1 - (target.d / FIRE_RANGE) * 0.45;
      const damage = Math.max(8, Math.round(DAMAGE * falloff));
      const hp = target.p.hp - damage;

      if (hp > 0) {
        await db.update(players).set({ hp }).where(eq(players.id, target.p.id));
        result = { ok: true, hit: true, kill: false, damage, target: target.p.callsign, ammo };
      } else {
        await db
          .update(players)
          .set({
            hp: 0,
            alive: false,
            deaths: target.p.deaths + 1,
            respawnAt: new Date(Date.now() + RESPAWN_MS),
          })
          .where(eq(players.id, target.p.id));
        await db
          .update(players)
          .set({ kills: me.kills + 1, score: me.score + 1 })
          .where(eq(players.id, me.id));
        await log(match.id, "kill", `${me.callsign} ▸ eliminated ${target.p.callsign}`, me.team);
        result = { ok: true, hit: true, kill: true, damage, target: target.p.callsign, ammo };
      }
      break;
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const state = await buildState(match.id);
  return NextResponse.json({ ...result, state });
}
