import Link from "next/link";
import InstallPrompt from "@/components/InstallPrompt";

const browsers = [
  {
    name: "Chrome (Android)",
    tag: "RECOMMENDED",
    steps: [
      "Open this site in Chrome (must be https:// or http:// to the host over your LAN).",
      "Tap the ⋮ three-dot menu in the top-right corner.",
      "Choose “Add to Home screen”, then “Install”.",
      "Confirm — NexusAR Strike appears in your app drawer and home screen.",
      "Alternatively tap the INSTALL APP button on this page; Chrome fires the native sheet.",
    ],
  },
  {
    name: "Samsung Internet",
    tag: "GALAXY",
    steps: [
      "Load the site, then tap ☰ (bottom-right).",
      "Tap “Add page to” → “Home screen”.",
      "Choose “Install” if offered (PWA), otherwise “Add”.",
      "Launch it from the home screen for fullscreen AR play.",
    ],
  },
  {
    name: "Edge / Brave / Opera",
    tag: "CHROMIUM",
    steps: [
      "Open the site, tap the browser menu (⋯ / ⋯ / O).",
      "Select “Add to phone” (Edge) or “Install app” / “Add to Home screen”.",
      "Confirm the prompt — the game installs as a standalone app.",
    ],
  },
  {
    name: "Firefox (Android)",
    tag: "LIMITED",
    steps: [
      "Firefox does not fire the install prompt for all PWAs.",
      "Tap ⋮ → “Install” if present; otherwise use “Add to Home screen” from the page menu.",
      "For a guaranteed installable build on Firefox, use the Capacitor/Android wrapper in the field manual.",
    ],
  },
];

export default function InstallPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-14 pt-10">
      <p className="font-mono text-[11px] tracking-[0.35em] text-sky-400">ANDROID · PWA INSTALL</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Install NexusAR Strike</h1>
      <p className="mt-2 text-sm text-slate-400">
        The game is a fully installable Progressive Web App: it runs fullscreen in portrait, gets its
        own home-screen icon, and caches the app shell so the lobby and field manual open with no
        signal at all.
      </p>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="font-mono text-[10px] tracking-widest text-slate-400">ONE-TAP INSTALL</p>
        <div className="mt-3">
          <InstallPrompt />
        </div>
      </section>

      <section className="mt-5 space-y-3">
        {browsers.map((b) => (
          <details
            key={b.name}
            open={b.tag === "RECOMMENDED"}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
              <span>{b.name}</span>
              <span className="font-mono text-[9px] tracking-widest text-sky-400">{b.tag}</span>
            </summary>
            <ol className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-400">
              {b.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[10px] text-slate-600">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-sky-400/30 bg-sky-500/5 p-4">
        <h2 className="font-mono text-[10px] tracking-widest text-sky-300">
          SQUAD SETUP AFTER INSTALL
        </h2>
        <ol className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-300">
          <li>1 · Host phone: enable the Wi-Fi hotspot (SSID shown in the lobby, e.g. AR-STRIKE-LAN).</li>
          <li>2 · Every operator joins that hotspot — no mobile data or internet required.</li>
          <li>
            3 · On the host, find the hotspot gateway IP (usually 192.168.43.1) and open the app from{" "}
            <code className="font-mono text-[11px] text-sky-300">http://192.168.43.1:3000</code> if
            you are self-hosting the server on that device.
          </li>
          <li>
            4 · Grant <b>Camera</b> and <b>Location</b> permission on first launch — camera powers the
            AR passthrough, location powers the compass heading for the auto-track minimap.
          </li>
          <li>5 · Keep the app installed on all 4 teams × 5 devices so the lobby code links instantly.</li>
        </ol>
      </section>

      <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="font-mono text-[10px] tracking-widest text-slate-400">TROUBLESHOOTING</h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
          <li>
            <b className="text-slate-200">No install prompt?</b> The page must be served over HTTPS
            (or reached through the host&apos;s LAN address) and the manifest + service worker must be
            reachable — both are bundled here.
          </li>
          <li>
            <b className="text-slate-200">Camera blocked?</b> Chrome only allows camera on HTTPS or
            localhost. Use the HTTPS preview URL, or add the host address as an “Insecure origin
            allowed” entry in chrome://flags.
          </li>
          <li>
            <b className="text-slate-200">Compass not moving?</b> Tap the screen once — Chromium
            requires a user gesture before motion sensor access.
          </li>
          <li>
            <b className="text-slate-200">Screen sleeping mid-match?</b> The live AR view requests a
            screen wake lock automatically while a match is running.
          </li>
          <li>
            <b className="text-slate-200">App stuck on an old build?</b> Open the app, then pull to
            refresh or clear site data — the service worker updates on the next visit.
          </li>
        </ul>
      </section>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link href="/" className="btn-primary text-center">
          PLAY NOW
        </Link>
        <Link
          href="/android"
          className="rounded-lg border border-slate-700 py-3 text-center font-mono text-[11px] tracking-[0.2em] text-slate-300"
        >
          FIELD MANUAL
        </Link>
      </div>
    </main>
  );
}
