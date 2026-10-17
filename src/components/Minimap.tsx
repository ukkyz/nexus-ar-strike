"use client";

import { useEffect, useRef } from "react";
import { CELL_SIZE, teamMeta, type MatchState, type PlayerView } from "@/lib/game";

export default function Minimap({
  state,
  me,
  size = 220,
}: {
  state: MatchState;
  me: PlayerView | null;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const arena = state.match.arenaSize;
    const s = size / arena;

    // fogged base
    ctx.fillStyle = "#06090f";
    ctx.fillRect(0, 0, size, size);

    // discovered (auto-tracked) cells
    for (const n of state.nodes) {
      const meta = teamMeta(n.team);
      ctx.globalAlpha = 0.18 + n.splatDensity * 0.35;
      ctx.fillStyle = meta.color;
      ctx.fillRect(n.gx * CELL_SIZE * s, n.gy * CELL_SIZE * s, CELL_SIZE * s, CELL_SIZE * s);
    }
    ctx.globalAlpha = 1;

    // grid
    ctx.strokeStyle = "rgba(148,163,184,0.12)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= arena; g += CELL_SIZE * 2) {
      ctx.beginPath();
      ctx.moveTo(g * s, 0);
      ctx.lineTo(g * s, size);
      ctx.moveTo(0, g * s);
      ctx.lineTo(size, g * s);
      ctx.stroke();
    }

    const toPx = (p: PlayerView) => ({ px: p.x * s, py: size - p.y * s });

    // player blips
    for (const p of state.players) {
      const meta = teamMeta(p.team);
      const { px, py } = toPx(p);
      const mine = me && p.id === me.id;
      const friendly = me && p.team === me.team;

      if (!mine && !friendly && !p.alive) continue;

      ctx.globalAlpha = p.alive ? 1 : 0.35;
      ctx.fillStyle = meta.color;
      ctx.beginPath();
      ctx.arc(px, py, mine ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (mine || friendly) {
        const rad = ((p.heading - 90) * Math.PI) / 180;
        ctx.strokeStyle = meta.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(rad) * 14, py + Math.sin(rad) * 14);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // scan sweep ring around me
    if (me) {
      const { px, py } = toPx(me);
      ctx.strokeStyle = "rgba(56,189,248,0.35)";
      ctx.beginPath();
      ctx.arc(px, py, 28 * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(56,189,248,0.4)";
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [state, me, size]);

  const coverage = Math.round(
    (state.nodes.length / Math.max(1, Math.pow(state.match.arenaSize / CELL_SIZE, 2))) * 100,
  );

  return (
    <div className="relative">
      <canvas ref={ref} style={{ width: size, height: size }} className="rounded-xl" />
      <div className="absolute bottom-1 left-2 font-mono text-[10px] tracking-wider text-sky-300/80">
        AUTO-TRACK {coverage}% MAPPED
      </div>
    </div>
  );
}
