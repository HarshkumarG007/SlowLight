export interface LightInput {
  id: string;
  chapterIndex: number; // -1 when the memory has no chapter
  occurredAt: number; // epoch ms
  significance: 1 | 2 | 3 | 4 | 5;
}
export interface LightPlacement {
  id: string;
  x: number;
  y: number;
  z: number; // Rail axis; travel direction is -z (forward in time)
  t: number; // 0 oldest .. 1 newest, drives Doppler color
  size: number;
}

export const LAYOUT = {
  unitsPerOrdinal: 1.6,
  unitsPerYear: 6,
  maxGapUnits: 10,
  chapterRadius: 9,
  scatter: 2.2,
  minSeparation: 0.9,
  relaxNeighbours: 12,
} as const;

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/** FNV-1a 32-bit hash. Stable across runtimes. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG returning floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Deterministic layout: same inputs and worldSeed always produce the same sky. */
export function layoutLights(
  inputs: readonly LightInput[],
  chapterCount: number,
  worldSeed: string,
): LightPlacement[] {
  const sorted = [...inputs].sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1));
  if (sorted.length === 0) return [];
  const t0 = sorted[0]!.occurredAt;
  const span = sorted[sorted.length - 1]!.occurredAt - t0;
  const out: LightPlacement[] = [];
  let z = 0;
  sorted.forEach((m, i) => {
    if (i > 0) {
      const gapYears = (m.occurredAt - sorted[i - 1]!.occurredAt) / YEAR_MS;
      z -= LAYOUT.unitsPerOrdinal + Math.min(gapYears * LAYOUT.unitsPerYear, LAYOUT.maxGapUnits);
    }
    const rand = mulberry32(hash32(worldSeed + m.id));
    let cx = 0;
    let cy = 0;
    if (m.chapterIndex >= 0) {
      const cRand = mulberry32(hash32(worldSeed + "chapter" + m.chapterIndex));
      const angle = (2 * Math.PI * m.chapterIndex) / Math.max(chapterCount, 1) + cRand() * 0.6;
      const radius = LAYOUT.chapterRadius * (0.35 + 0.65 * cRand());
      cx = Math.cos(angle) * radius;
      cy = Math.sin(angle) * radius * 0.6;
    }
    let x = cx + gaussian(rand) * LAYOUT.scatter;
    let y = cy + gaussian(rand) * LAYOUT.scatter * 0.7;
    for (let k = out.length - 1; k >= Math.max(0, out.length - LAYOUT.relaxNeighbours); k--) {
      const p = out[k]!;
      if (Math.abs(p.z - z) > LAYOUT.minSeparation) break;
      const dx = x - p.x;
      const dy = y - p.y;
      const d = Math.hypot(dx, dy, p.z - z);
      if (d < LAYOUT.minSeparation) {
        const ang = rand() * 2 * Math.PI;
        x += Math.cos(ang) * (LAYOUT.minSeparation - d);
        y += Math.sin(ang) * (LAYOUT.minSeparation - d);
      }
    }
    out.push({
      id: m.id, x, y, z,
      t: span === 0 ? 0.5 : (m.occurredAt - t0) / span,
      size: 0.5 + 0.35 * (m.significance - 1),
    });
  });
  return out;
}

const RAMP: ReadonlyArray<readonly [number, [number, number, number]]> = [
  [0, [0xe3, 0x9a, 0x55]],
  [0.5, [0xf0, 0xd3, 0xa6]],
  [1, [0xf7, 0xf2, 0xe8]],
];
/** Doppler color ramp: amber (old) to candle white (frontier). Returns 0..255 RGB. */
export function rampColor(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, c1] = RAMP[i]!;
    const [t0_, c0] = RAMP[i - 1]!;
    if (c <= t1) {
      const f = (c - t0_) / (t1 - t0_);
      return [0, 1, 2].map((k) => Math.round(c0[k]! + (c1[k]! - c0[k]!) * f)) as [number, number, number];
    }
  }
  return [...RAMP[RAMP.length - 1]![1]] as [number, number, number];
}
