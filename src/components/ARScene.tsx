"use client";

import { useEffect, useRef } from "react";
import {
  FIRE_RANGE,
  SPLAT_SCENES,
  bearing,
  dist,
  teamMeta,
  type MatchState,
  type PlayerView,
} from "@/lib/game";

const FOV = 70;

export default function ARScene({
  state,
  me,
  splatOn,
  cameraOn,
  onCameraError,
}: {
  state: MatchState;
  me: PlayerView | null;
  splatOn: boolean;
  cameraOn: boolean;
  onCameraError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const splatRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!cameraOn) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        onCameraError("Camera unavailable — running synthetic splat passthrough.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraOn, onCameraError]);

  // Gaussian splat enhancement pass (anisotropic blobs re-lighting the scene)
  useEffect(() => {
    const canvas = splatRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const scene = SPLAT_SCENES.find((s) => s.id === state.match.splatScene) ?? SPLAT_SCENES[0];

    const blobs = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      rx: 0.02 + Math.random() * 0.12,
      ry: 0.01 + Math.random() * 0.07,
      rot: Math.random() * Math.PI,
      spd: 0.00004 + Math.random() * 0.0002,
      a: 0.05 + Math.random() * 0.22,
    }));

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const heading = () => me?.heading ?? 0;
    let t = 0;
    const draw = () => {
      t += 1;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (splatOn) {
        const drift = ((heading() % 360) / 360) * w;
        for (const b of blobs) {
          const x = (((b.x * w - drift) % w) + w) % w;
          const y = b.y * h + Math.sin(t * b.spd * 800 + b.rot) * 8;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, b.rx * w);
          grad.addColorStop(0, hexA(scene.tint, b.a));
          grad.addColorStop(1, hexA(scene.tint, 0));
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(b.rot + t * 0.0008);
          ctx.scale(1, b.ry / b.rx);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, b.rx * w, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // depth scanline
        ctx.strokeStyle = "rgba(125,211,252,0.06)";
        for (let y = (t % 6); y < h; y += 6) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [splatOn, state.match.splatScene, me]);

  const contacts = me
    ? state.players
        .filter((p) => p.id !== me.id && p.alive)
        .map((p) => {
          const d = dist(me.x, me.y, p.x, p.y);
          let off = bearing(me.x, me.y, p.x, p.y) - me.heading;
          off = ((off + 540) % 360) - 180;
          return { p, d, off };
        })
        .filter((c) => Math.abs(c.off) < FOV / 2 + 6 && c.d < 60)
        .sort((a, b) => b.d - a.d)
    : [];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(8,20,35,0.25),rgba(2,6,12,0.85))]" />
      <canvas ref={splatRef} className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen" />

      {/* contacts projected into the camera FOV */}
      {contacts.map(({ p, d, off }) => {
        const meta = teamMeta(p.team);
        const friendly = me && p.team === me.team;
        const left = 50 + (off / FOV) * 100;
        const scale = Math.max(0.35, 1.5 - d / 40);
        const inRange = d <= FIRE_RANGE;
        return (
          <div
            key={p.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${left}%`, top: `${52 + (d / 60) * 8}%` }}
          >
            <div
              className="rounded-md border-2"
              style={{
                width: 70 * scale,
                height: 110 * scale,
                borderColor: meta.color,
                background: `linear-gradient(180deg, ${meta.glow}, transparent)`,
                boxShadow: `0 0 ${inRange ? 24 : 8}px ${meta.glow}`,
              }}
            />
            <div
              className="mt-1 font-mono text-[10px] font-bold tracking-wider"
              style={{ color: meta.color }}
            >
              {friendly ? "◈" : "✖"} {p.callsign} · {d.toFixed(0)}m
            </div>
            <div className="mx-auto mt-0.5 h-1 w-12 rounded bg-black/60">
              <div
                className="h-1 rounded"
                style={{ width: `${p.hp}%`, background: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function hexA(hex: string, alpha: number) {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
