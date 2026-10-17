"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SPLAT_SCENES } from "@/lib/game";
import { getCallsign, getDeviceId, setCallsign } from "@/lib/device";
import InstallPrompt from "@/components/InstallPrompt";

type Lobby = {
  code: string;
  name: string;
  hotspotSsid: string;
  status: string;
  splatScene: string;
  players: number;
  capacity: number;
};

export default function Home() {
  const router = useRouter();
  const [callsign, setCall] = useState("");
  const [tab, setTab] = useState<"host" | "join">("host");
  const [opName, setOpName] = useState("Operation Nightfall");
  const [ssid, setSsid] = useState("AR-STRIKE-LAN");
  const [scene, setScene] = useState<string>(SPLAT_SCENES[0].id);
  const [arena, setArena] = useState(60);
  const [code, setCode] = useState("");
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCall(getCallsign());
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "host" || q === "join") setTab(q);
    const load = async () => {
      const res = await fetch("/api/matches", { cache: "no-store" });
      if (res.ok) setLobbies((await res.json()).lobbies as Lobby[]);
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  async function host() {
    if (!callsign.trim()) return setError("Enter a callsign");
    setBusy(true);
    setError("");
    setCallsign(callsign.trim().toUpperCase());
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        callsign: callsign.trim(),
        name: opName,
        hotspotSsid: ssid,
        splatScene: scene,
        arenaSize: arena,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Failed to host");
    router.push(`/play/${data.code}`);
  }

  async function join(target?: string) {
    const c = (target ?? code).trim().toUpperCase();
    if (!callsign.trim()) return setError("Enter a callsign");
    if (c.length < 4) return setError("Enter the 5-char squad link code");
    setBusy(true);
    setError("");
    setCallsign(callsign.trim().toUpperCase());
    const res = await fetch(`/api/matches/${c}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId(), callsign: callsign.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Failed to join");
    router.push(`/play/${c}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10 text-slate-100">
      <header className="mb-7">
        <p className="font-mono text-[11px] tracking-[0.35em] text-sky-400">ANDROID · AR · LAN</p>
        <h1 className="mt-1 text-4xl font-black leading-none tracking-tight">
          NEXUS<span className="text-sky-400">AR</span> STRIKE
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Room-scale first-person AR combat. Up to <b className="text-slate-200">4 teams × 5 operators</b>{" "}
          synced over one Wi-Fi hotspot, with Gaussian-splat scene enhancement and a progressive
          auto-tracking minimap.
        </p>
      </header>

      <label className="mb-1 block font-mono text-[11px] tracking-widest text-slate-400">
        CALLSIGN
      </label>
      <input
        value={callsign}
        onChange={(e) => setCall(e.target.value.toUpperCase())}
        placeholder="GHOST-01"
        maxLength={14}
        className="mb-5 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 font-mono text-lg tracking-widest outline-none focus:border-sky-400"
      />

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-900/70 p-1">
        {(["host", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md py-2 font-mono text-xs tracking-widest transition ${
              tab === t ? "bg-sky-500 text-slate-950" : "text-slate-400"
            }`}
          >
            {t === "host" ? "HOST HOTSPOT" : "JOIN SQUAD"}
          </button>
        ))}
      </div>

      {tab === "host" ? (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <Field label="OPERATION">
            <input
              value={opName}
              onChange={(e) => setOpName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="HOTSPOT SSID (WI-FI SHARING)">
            <input value={ssid} onChange={(e) => setSsid(e.target.value)} className="input" />
          </Field>
          <Field label="GAUSSIAN SPLAT SCENE">
            <div className="grid grid-cols-2 gap-2">
              {SPLAT_SCENES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScene(s.id)}
                  className={`rounded-lg border p-2 text-left text-xs ${
                    scene === s.id
                      ? "border-sky-400 bg-sky-500/10"
                      : "border-slate-700 bg-slate-950/40"
                  }`}
                >
                  <span className="block font-semibold" style={{ color: s.tint }}>
                    {s.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{s.detail}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label={`ARENA SIZE · ${arena}m × ${arena}m`}>
            <input
              type="range"
              min={30}
              max={120}
              step={10}
              value={arena}
              onChange={(e) => setArena(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
          </Field>
          <button onClick={host} disabled={busy} className="btn-primary">
            {busy ? "OPENING LAN…" : "OPEN SQUAD LAN"}
          </button>
        </section>
      ) : (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <Field label="SQUAD LINK CODE">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="X7K2Q"
              className="input text-center text-2xl tracking-[0.5em]"
            />
          </Field>
          <button onClick={() => join()} disabled={busy} className="btn-primary">
            {busy ? "LINKING…" : "LINK TO SQUAD"}
          </button>
          <div className="pt-2">
            <p className="mb-2 font-mono text-[11px] tracking-widest text-slate-400">
              DISCOVERED ON THIS NETWORK
            </p>
            {lobbies.length === 0 && (
              <p className="text-xs text-slate-500">No hosts broadcasting yet.</p>
            )}
            <div className="space-y-2">
              {lobbies.map((l) => (
                <button
                  key={l.code}
                  onClick={() => join(l.code)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold">{l.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {l.hotspotSsid} · {l.code} · {l.status.toUpperCase()}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-sky-300">
                    {l.players}/{l.capacity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <section className="mt-8 space-y-2 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-400">
        <p className="font-mono text-[11px] tracking-widest text-slate-300">FIELD SETUP</p>
        <p>1 · Host enables the Android hotspot; squads join the same SSID — no internet needed.</p>
        <p>2 · Grant camera + motion sensor permission so the AR passthrough and compass heading work.</p>
        <p>3 · Walk the real arena: swept cells stream into the shared progressive minimap.</p>
        <div className="mt-3 flex items-center gap-4">
          <a href="/install" className="font-mono text-[11px] text-sky-400">
            INSTALL AS ANDROID APP →
          </a>
          <a href="/android" className="font-mono text-[11px] text-slate-500">
            FIELD MANUAL
          </a>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Installable PWA</p>
          <p className="text-[11px] text-slate-400">
            Fullscreen portrait app · offline shell · home-screen icon
          </p>
        </div>
        <InstallPrompt compact />
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] tracking-widest text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
