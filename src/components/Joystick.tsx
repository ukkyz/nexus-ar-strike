"use client";

import { useRef, useState } from "react";

export default function Joystick({
  onChange,
}: {
  onChange: (v: { x: number; y: number }) => void;
}) {
  const base = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const handle = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    onChange({ x: dx / max, y: -dy / max });
  };

  const reset = () => {
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      onTouchStart={(e) => handle(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handle(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={reset}
      onMouseDown={(e) => handle(e.clientX, e.clientY)}
      onMouseMove={(e) => e.buttons === 1 && handle(e.clientX, e.clientY)}
      onMouseUp={reset}
      onMouseLeave={reset}
      className="relative h-32 w-32 touch-none rounded-full border border-sky-400/40 bg-slate-950/50 backdrop-blur"
    >
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/70 shadow-[0_0_24px_rgba(56,189,248,0.6)]"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-widest text-sky-300/70">
        MOVE
      </span>
    </div>
  );
}
