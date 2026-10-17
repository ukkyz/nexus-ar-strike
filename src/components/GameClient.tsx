"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ARScene from "@/components/ARScene";
import Joystick from "@/components/Joystick";
import Minimap from "@/components/Minimap";
import { MAG_SIZE, SPLAT_SCENES, TEAM_META, teamMeta, type MatchState } from "@/lib/game";
import { getCallsign, getDeviceId } from "@/lib/device";

const MOVE_SPEED = 4.2; // m/s

type OrientationEventCtor = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export default function GameClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<MatchState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [splatOn, setSplatOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [hitFlash, setHitFlash] = useState(0);
  const [muzzle, setMuzzle] = useState(false);
  const [compass, setCompass] = useState(false);

  const deviceId = useRef("");
  const pos = useRef({ x: 10, y: 10 });
  const headingRef = useRef(0);
  const move = useRef({ x: 0, y: 0 });
  const seeded = useRef(false);

  useEffect(() => {
    deviceId.current = getDeviceId();
  }, []);

  const myId = useRef<number | null>(null);
  const me = useMemo(
    () => state?.players.find((p) => p.id === myId.current) ?? null,
    [state],
  );

  const tick = useCallback(async () => {
    if (!deviceId.current) return;
    try {
      const res = await fetch(`/api/matches/${code}/tick`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceId.current,
          x: pos.current.x,
          y: pos.current.y,
          heading: headingRef.current,
        }),
      });
      if (!res.ok) {
        setError("Squad link lost — host may have closed the LAN.");
        return;
      }
      const data = (await res.json()) as MatchState;
      setState(data);
    } catch {
      setError("Network unreachable on this hotspot.");
    }
  }, [code]);

  // identify self via a dedicated join call (idempotent) so we know our id
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/matches/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          callsign: getCallsign() || `OP-${Math.floor(Math.random() * 900 + 100)}`,
        }),
      });
      const data = await res.json();
      if (!alive) return;
      if (!res.ok) {
        setError(data.error ?? "Could not link to squad");
        return;
      }
      myId.current = data.playerId as number;
      await tick();
    })();
    return () => {
      alive = false;
    };
  }, [code, tick]);

  // polling loop
  useEffect(() => {
    const t = setInterval(() => void tick(), 900);
    return () => clearInterval(t);
  }, [tick]);

  // seed local position from server spawn once
  useEffect(() => {
    if (!seeded.current && me) {
      pos.current = { x: me.x, y: me.y };
      headingRef.current = me.heading;
      seeded.current = true;
    }
  }, [me]);

  // movement integration
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const arena = state?.match.arenaSize ?? 60;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const m = move.current;
      if (m.x || m.y) {
        const rad = (headingRef.current * Math.PI) / 180;
        const fx = Math.sin(rad);
        const fy = Math.cos(rad);
        pos.current.x = clamp(pos.current.x + (fy * m.x + fx * m.y) * MOVE_SPEED * dt, 0, arena);
        pos.current.y = clamp(pos.current.y + (-fx * m.x + fy * m.y) * MOVE_SPEED * dt, 0, arena);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state?.match.arenaSize]);

  // compass heading
  const enableCompass = useCallback(async () => {
    const ctor = window.DeviceOrientationEvent as unknown as OrientationEventCtor;
    try {
      if (ctor?.requestPermission) {
        const ok = await ctor.requestPermission();
        if (ok !== "granted") return;
      }
    } catch {
      /* ignore */
    }
    const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
      if (h != null) headingRef.current = (h + 360) % 360;
    };
    window.addEventListener("deviceorientationabsolute", handler as EventListener);
    window.addEventListener("deviceorientation", handler as EventListener);
    setCompass(true);
  }, []);

  useEffect(() => {
    void enableCompass();
  }, [enableCompass]);

  // screen wake lock while a live match is on screen
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void lock?.release().catch(() => undefined);
    };
  }, []);

  // drag to look (desktop / no-compass fallback)
  const dragRef = useRef<number | null>(null);
  const onLookStart = (x: number) => (dragRef.current = x);
  const onLookMove = (x: number) => {
    if (dragRef.current == null) return;
    headingRef.current = (headingRef.current + (x - dragRef.current) * 0.4 + 360) % 360;
    dragRef.current = x;
  };

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const res = await fetch(`/api/matches/${code}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: deviceId.current, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Action rejected");
        setTimeout(() => setNotice(""), 2000);
        return null;
      }
      if (data.state) setState(data.state as MatchState);
      return data;
    },
    [code],
  );

  const fire = useCallback(async () => {
    setMuzzle(true);
    setTimeout(() => setMuzzle(false), 90);
    if (navigator.vibrate) navigator.vibrate(18);
    const data = await act("fire");
    if (data?.hit) {
      setHitFlash(Date.now());
      if (data.kill) setNotice(`ELIMINATED ${data.target}`);
      setTimeout(() => setNotice(""), 1400);
    }
  }, [act]);

  if (error) {
    return (
      <Centered>
        <p className="text-rose-400">{error}</p>
        <button onClick={() => router.push("/")} className="btn-primary mt-4 max-w-xs">
          BACK TO BASE
        </button>
      </Centered>
    );
  }

  if (!state) return <Centered>Establishing squad link…</Centered>;

  const match = state.match;
  const myTeam = me ? teamMeta(me.team) : TEAM_META[0];

  /* ---------------- LOBBY ---------------- */
  if (match.status === "lobby") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
        <p className="font-mono text-[11px] tracking-[0.3em] text-sky-400">SQUAD LINK</p>
        <h1 className="text-3xl font-black tracking-tight">{match.name}</h1>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-slate-400">CODE</p>
            <p className="font-mono text-2xl tracking-[0.35em] text-sky-300">{match.code}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-[10px] tracking-widest text-slate-400">HOTSPOT</p>
            <p className="text-sm">{match.hotspotSsid}</p>
            <p className="font-mono text-[10px] text-slate-500">{match.hostIp}</p>
          </div>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-2">
          {TEAM_META.slice(0, match.maxTeams).map((t) => {
            const members = state.players.filter((p) => p.team === t.id);
            const mineTeam = me?.team === t.id;
            return (
              <button
                key={t.id}
                onClick={() => act("team", { team: t.id })}
                className={`rounded-xl border p-3 text-left transition ${
                  mineTeam ? "border-2" : "border-slate-800 bg-slate-900/40"
                }`}
                style={mineTeam ? { borderColor: t.color, background: t.glow } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-widest" style={{ color: t.color }}>
                    {t.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {members.length}/{match.maxPerTeam}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {members.map((p) => (
                    <li key={p.id} className="truncate text-[11px] text-slate-300">
                      {p.ready ? "●" : "○"} {p.callsign}
                      {p.isHost ? " ★" : ""}
                    </li>
                  ))}
                  {members.length === 0 && (
                    <li className="text-[11px] text-slate-600">empty slot</li>
                  )}
                </ul>
              </button>
            );
          })}
        </section>

        <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <p className="mb-2 font-mono text-[10px] tracking-widest text-slate-400">
            GAUSSIAN SPLAT ENVIRONMENT
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SPLAT_SCENES.map((s) => (
              <button
                key={s.id}
                disabled={!me?.isHost}
                onClick={() => act("scene", { scene: s.id })}
                className={`rounded-lg border p-2 text-left text-[11px] disabled:opacity-60 ${
                  match.splatScene === s.id
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-slate-700 bg-slate-950/40"
                }`}
              >
                <span className="block font-semibold" style={{ color: s.tint }}>
                  {s.name}
                </span>
                <span className="text-[9px] text-slate-400">{s.detail}</span>
              </button>
            ))}
          </div>
          {!me?.isHost && (
            <p className="mt-2 text-[10px] text-slate-500">Host controls the streamed capture.</p>
          )}
        </section>

        <section className="mt-4 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <Minimap state={state} me={me} size={140} />
          <div className="text-xs text-slate-400">
            <p className="font-mono text-[10px] tracking-widest text-slate-300">ARENA</p>
            <p>
              {match.arenaSize}m × {match.arenaSize}m
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-widest text-slate-300">SCORE LIMIT</p>
            <p>{match.scoreLimit} eliminations</p>
            <p className="mt-2 font-mono text-[10px] tracking-widest text-slate-300">COMPASS</p>
            <p>{compass ? "sensor locked" : "drag-to-look"}</p>
          </div>
        </section>

        <div className="mt-5 space-y-2">
          <button onClick={() => act("ready")} className="btn-primary">
            {me?.ready ? "STAND DOWN" : "MARK READY"}
          </button>
          {me?.isHost && (
            <button
              onClick={() => act("start")}
              className="w-full rounded-lg border border-emerald-400 bg-emerald-500/15 py-3 font-mono text-xs tracking-[0.2em] text-emerald-300"
            >
              DEPLOY ALL SQUADS
            </button>
          )}
          <button
            onClick={async () => {
              await act("leave");
              router.push("/");
            }}
            className="w-full py-2 font-mono text-[11px] tracking-widest text-slate-500"
          >
            LEAVE LAN
          </button>
        </div>
        {notice && <p className="mt-3 text-center text-xs text-amber-300">{notice}</p>}
      </main>
    );
  }

  /* ---------------- ENDED ---------------- */
  if (match.status === "ended") {
    const ranked = [...state.teamScores].sort((a, b) => b.score - a.score);
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-12">
        <h1 className="text-3xl font-black tracking-tight">MISSION COMPLETE</h1>
        <p className="font-mono text-[11px] tracking-widest text-slate-400">{match.name}</p>
        <div className="mt-5 space-y-2">
          {ranked.map((t, i) => {
            const meta = teamMeta(t.team);
            return (
              <div
                key={t.team}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                style={i === 0 ? { borderColor: meta.color } : undefined}
              >
                <span className="font-mono text-sm" style={{ color: meta.color }}>
                  #{i + 1} {meta.name}
                </span>
                <span className="font-mono text-sm text-slate-300">
                  {t.score} pts · {t.players} ops
                </span>
              </div>
            );
          })}
        </div>
        <h2 className="mt-6 font-mono text-[11px] tracking-widest text-slate-400">OPERATORS</h2>
        <div className="mt-2 space-y-1">
          {[...state.players]
            .sort((a, b) => b.kills - a.kills)
            .map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span style={{ color: teamMeta(p.team).color }}>{p.callsign}</span>
                <span className="font-mono text-slate-400">
                  {p.kills}K / {p.deaths}D
                </span>
              </div>
            ))}
        </div>
        <button onClick={() => router.push("/")} className="btn-primary mt-8">
          RETURN TO BASE
        </button>
      </main>
    );
  }

  /* ---------------- LIVE AR ---------------- */
  const recentHit = Date.now() - hitFlash < 250;
  return (
    <main
      className="relative h-[100dvh] w-full touch-none select-none overflow-hidden"
      onTouchStart={(e) => onLookStart(e.touches[0].clientX)}
      onTouchMove={(e) => onLookMove(e.touches[0].clientX)}
      onTouchEnd={() => (dragRef.current = null)}
      onMouseDown={(e) => onLookStart(e.clientX)}
      onMouseMove={(e) => e.buttons === 1 && onLookMove(e.clientX)}
      onMouseUp={() => (dragRef.current = null)}
    >
      <ARScene
        state={state}
        me={me}
        splatOn={splatOn}
        cameraOn={cameraOn}
        onCameraError={(m) => setNotice(m)}
      />

      {/* crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-10 w-10 rounded-full border-2"
          style={{
            borderColor: recentHit ? "#f43f5e" : "rgba(226,232,240,0.7)",
            boxShadow: muzzle ? "0 0 40px rgba(251,191,36,0.9)" : undefined,
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="rounded-lg bg-black/50 px-3 py-2 backdrop-blur">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: myTeam.color }}>
            {myTeam.name} · {me?.callsign}
          </p>
          <div className="mt-1 h-1.5 w-28 rounded bg-slate-700">
            <div
              className="h-1.5 rounded transition-all"
              style={{ width: `${me?.hp ?? 0}%`, background: me && me.hp > 35 ? "#22c55e" : "#f43f5e" }}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-slate-300">
            HP {me?.hp ?? 0} · AMMO {me?.ammo ?? 0}/{MAG_SIZE}
          </p>
        </div>
        <div className="rounded-lg bg-black/50 px-3 py-2 text-right backdrop-blur">
          {state.teamScores
            .filter((t) => t.players > 0)
            .map((t) => (
              <p key={t.team} className="font-mono text-[10px]" style={{ color: teamMeta(t.team).color }}>
                {teamMeta(t.team).name} {t.score}/{match.scoreLimit}
              </p>
            ))}
        </div>
      </div>

      {/* minimap */}
      <div className="absolute right-3 top-28 rounded-xl border border-sky-400/30 bg-black/50 p-1 backdrop-blur">
        <Minimap state={state} me={me} size={128} />
      </div>

      {/* killfeed */}
      <div className="pointer-events-none absolute left-3 top-28 w-40 space-y-1">
        {state.events
          .filter((e) => e.kind === "kill" || e.kind === "respawn")
          .slice(0, 4)
          .map((e) => (
            <p
              key={e.id}
              className="truncate rounded bg-black/45 px-2 py-1 font-mono text-[9px] text-slate-200"
            >
              {e.message}
            </p>
          ))}
      </div>

      {/* toggles */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <Toggle on={splatOn} onClick={() => setSplatOn((v) => !v)} label="SPLAT" />
        <Toggle on={cameraOn} onClick={() => setCameraOn((v) => !v)} label="CAM" />
      </div>

      {/* controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
        <Joystick onChange={(v) => (move.current = v)} />
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={() => act("reload")}
            className="rounded-full border border-slate-400/40 bg-black/50 px-4 py-2 font-mono text-[10px] tracking-widest text-slate-200"
          >
            RELOAD
          </button>
          <button
            onPointerDown={fire}
            disabled={!me?.alive}
            className="h-24 w-24 rounded-full border-4 border-rose-400/80 bg-rose-500/30 font-mono text-xs tracking-widest text-white shadow-[0_0_30px_rgba(244,63,94,0.5)] disabled:opacity-40"
          >
            FIRE
          </button>
        </div>
      </div>

      {/* down overlay */}
      {me && !me.alive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/60 backdrop-blur-sm">
          <p className="font-mono text-sm tracking-[0.3em] text-rose-200">OPERATOR DOWN</p>
          <p className="mt-2 text-xs text-rose-300/80">Auto-redeploy in progress…</p>
        </div>
      )}

      {notice && (
        <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 rounded bg-black/60 px-3 py-1 font-mono text-[11px] tracking-widest text-amber-300">
          {notice}
        </div>
      )}
    </main>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1 font-mono text-[9px] tracking-widest backdrop-blur ${
        on ? "border-sky-400 bg-sky-500/20 text-sky-200" : "border-slate-600 bg-black/40 text-slate-400"
      }`}
    >
      {label}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center font-mono text-sm text-slate-300">
      {children}
    </main>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
