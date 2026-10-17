"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setInstalled(
      typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          window.matchMedia("(display-mode: fullscreen)").matches ||
          // @ts-expect-error Android-specific flag
          window.navigator.standalone === true),
    );

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setStatus("Installed — launch NexusAR Strike from your home screen.");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) {
      setStatus(
        "Use your browser menu → “Add to Home screen” / “Install app” (see steps below).",
      );
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setStatus("Installing…");
    } else {
      setStatus("Install dismissed.");
    }
    setPromptEvent(null);
  }, [promptEvent]);

  if (compact) {
    if (installed) {
      return <p className="font-mono text-[10px] tracking-widest text-emerald-400">PWA INSTALLED</p>;
    }
    return (
      <button
        onClick={install}
        className="rounded-md border border-sky-400/60 bg-sky-500/15 px-3 py-1.5 font-mono text-[10px] tracking-widest text-sky-200"
      >
        INSTALL APP
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={install} disabled={installed} className="btn-primary">
        {installed ? "ALREADY INSTALLED" : promptEvent ? "INSTALL NEXUSAR STRIKE" : "HOW TO INSTALL"}
      </button>
      <ul className="space-y-1 font-mono text-[10px] tracking-wide text-slate-400">
        <li>
          APP SHELL CACHE ·{" "}
          <span className={swReady ? "text-emerald-400" : "text-amber-400"}>
            {swReady ? "SERVICE WORKER ACTIVE" : "REGISTERING…"}
          </span>
        </li>
        <li>
          INSTALL PROMPT ·{" "}
          <span className={promptEvent ? "text-emerald-400" : "text-amber-400"}>
            {installed ? "STANDALONE MODE" : promptEvent ? "READY" : "USE BROWSER MENU"}
          </span>
        </li>
      </ul>
      {status && <p className="text-[11px] text-sky-300">{status}</p>}
    </div>
  );
}
