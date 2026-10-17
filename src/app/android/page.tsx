import Link from "next/link";

const steps = [
  {
    title: "1 · Wi-Fi hotspot squad link",
    body: "The host device enables the Android hotspot (default SSID AR-STRIKE-LAN, gateway 192.168.43.1). Every joining phone hits the host's LAN address, so matchmaking, telemetry and hit registration all stay offline on the local network. Capacity is enforced server-side at 4 teams × 5 operators = 20 devices.",
  },
  {
    title: "2 · Gaussian splat environment enhancement",
    body: "Each arena ships a pre-captured 3D Gaussian splat scene (1.8M–4.1M splats). The host picks the capture in the lobby and it is streamed to all peers over the hotspot; the client composites anisotropic splat kernels over the camera passthrough for relighting, occlusion cues and depth-consistent cover.",
  },
  {
    title: "3 · Progressive auto-track minimap",
    body: "Camera VIO + compass heading are fused into an arena-space pose. Every 4m cell an operator sweeps is written to the shared map graph, so the fog-of-war minimap builds itself up automatically as your squad advances — no manual scanning step.",
  },
  {
    title: "4 · Installing as a PWA",
    body: "Open the site in Chrome and tap ⋮ → “Add to Home screen” → “Install”, or use the one-tap INSTALL APP button on the /install page. A manifest (fullscreen portrait, maskable icon, host/join shortcuts) plus a service worker (app-shell precache, network-first navigations, offline fallback, zero caching of /api game traffic) make it a real standalone Android app.",
  },
  {
    title: "5 · Packaging for Android",
    body: "This build runs as an installable PWA on Chrome/Android (camera + DeviceOrientation + vibration APIs). For a Play Store binary, wrap it with Capacitor (npx cap add android) or a Trusted Web Activity, and swap the passthrough layer for ARCore + the native splat renderer while keeping these exact REST endpoints.",
  },
];

export default function AndroidPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
      <h1 className="text-3xl font-black tracking-tight">FIELD MANUAL</h1>
      <p className="mt-1 font-mono text-[11px] tracking-[0.3em] text-sky-400">
        NEXUSAR STRIKE · ANDROID
      </p>
      <div className="mt-6 space-y-3">
        {steps.map((s) => (
          <section key={s.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-sm font-semibold text-sky-300">{s.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link href="/install" className="btn-primary text-center">
          INSTALL APP
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-slate-700 py-3 text-center font-mono text-[11px] tracking-[0.2em] text-slate-300"
        >
          BACK TO BASE
        </Link>
      </div>
    </main>
  );
}
