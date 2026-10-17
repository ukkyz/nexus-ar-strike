export const TEAM_META = [
  { id: 1, name: "ALPHA", color: "#38bdf8", glow: "rgba(56,189,248,0.45)" },
  { id: 2, name: "BRAVO", color: "#f87171", glow: "rgba(248,113,113,0.45)" },
  { id: 3, name: "CHARLIE", color: "#4ade80", glow: "rgba(74,222,128,0.45)" },
  { id: 4, name: "DELTA", color: "#fbbf24", glow: "rgba(251,191,36,0.45)" },
] as const;

export function teamMeta(team: number) {
  return TEAM_META.find((t) => t.id === team) ?? TEAM_META[0];
}

export const SPLAT_SCENES = [
  {
    id: "warehouse",
    name: "Warehouse 07",
    detail: "3.2M splats · indoor industrial capture",
    tint: "#38bdf8",
  },
  {
    id: "rooftop",
    name: "Rooftop Sector",
    detail: "1.8M splats · outdoor daylight capture",
    tint: "#fb923c",
  },
  {
    id: "carpark",
    name: "Sub-level Carpark",
    detail: "2.4M splats · low-light relit capture",
    tint: "#a78bfa",
  },
  {
    id: "campus",
    name: "Campus Quad",
    detail: "4.1M splats · large-scale outdoor capture",
    tint: "#4ade80",
  },
] as const;

export const CELL_SIZE = 4; // meters per minimap cell
export const FIRE_RANGE = 28; // meters
export const FIRE_CONE = 14; // degrees half-angle
export const DAMAGE = 34;
export const MAG_SIZE = 30;
export const RESPAWN_MS = 6000;

export function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function angleDiff(a: number, b: number) {
  let d = ((a - b + 180) % 360) - 180;
  if (d < -180) d += 360;
  return Math.abs(d);
}

export function bearing(fromX: number, fromY: number, toX: number, toY: number) {
  const deg = (Math.atan2(toX - fromX, toY - fromY) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export function spawnPoint(team: number, arena: number, index: number) {
  const pad = arena * 0.12;
  const corners = [
    { x: pad, y: pad },
    { x: arena - pad, y: arena - pad },
    { x: arena - pad, y: pad },
    { x: pad, y: arena - pad },
  ];
  const c = corners[(team - 1) % 4];
  const jitter = (index % 5) * 1.6 - 3.2;
  return { x: c.x + jitter, y: c.y + jitter };
}

export type PlayerView = {
  id: number;
  callsign: string;
  team: number;
  hp: number;
  ammo: number;
  kills: number;
  deaths: number;
  score: number;
  alive: boolean;
  isHost: boolean;
  ready: boolean;
  x: number;
  y: number;
  heading: number;
  respawnAt: string | null;
  online: boolean;
};

export type MatchState = {
  match: {
    id: number;
    code: string;
    name: string;
    hotspotSsid: string;
    hostIp: string;
    splatScene: string;
    status: string;
    arenaSize: number;
    maxTeams: number;
    maxPerTeam: number;
    scoreLimit: number;
  };
  players: PlayerView[];
  teamScores: { team: number; score: number; kills: number; players: number }[];
  nodes: { gx: number; gy: number; team: number; splatDensity: number }[];
  events: { id: number; kind: string; message: string; team: number | null; createdAt: string }[];
};
