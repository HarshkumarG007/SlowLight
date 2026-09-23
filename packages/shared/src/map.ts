export type LocationPrecision = 'exact' | 'area' | 'city' | 'country' | 'hidden';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface SvgPoint {
  x: number;
  y: number;
}

export interface MapMemoryPin {
  id: string;
  memoryId: string;
  title: string;
  occurredOn: string;
  emotion?: string | null;
  significance: number;
  locationId: string;
  label: string;
  lat: number;
  lng: number;
  precision: LocationPrecision;
}

/**
 * Coarsens coordinates according to privacy precision level.
 * In Slow Light, coordinates are strictly coarsened before leaving the server
 * or when projected, ensuring exact sub-kilometer GPS tracks are never revealed.
 */
export function coarsenCoordinate(val: number, precision: LocationPrecision): number {
  switch (precision) {
    case 'country':
      // ~111 km resolution
      return Math.round(val);
    case 'area':
      // ~55 km resolution
      return Math.round(val * 2) / 2;
    case 'city':
      // ~11 km resolution (standard default)
      return Math.round(val * 10) / 10;
    case 'exact':
      // Guardrail: capped at ~1.1 km even when labeled "exact"
      return Math.round(val * 100) / 100;
    case 'hidden':
      return 0;
    default:
      return Math.round(val * 10) / 10;
  }
}

/**
 * Clamps coordinates to valid latitude [-90, 90] and longitude [-180, 180].
 */
export function clampCoords(coords: GeoCoords): GeoCoords {
  return {
    lat: Math.max(-90, Math.min(90, coords.lat)),
    lng: Math.max(-180, Math.min(180, coords.lng)),
  };
}

/**
 * Standard Equirectangular projection converting (lat, lng) to SVG (x, y) space.
 * Default SVG coordinate space is viewBox="0 0 1000 500".
 */
export function projectEquirectangular(
  coords: GeoCoords,
  width = 1000,
  height = 500,
): SvgPoint {
  const { lat, lng } = clampCoords(coords);
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  };
}

/**
 * Inverts an SVG (x, y) point back to geographic (lat, lng).
 */
export function inverseEquirectangular(
  point: SvgPoint,
  width = 1000,
  height = 500,
): GeoCoords {
  const clampedX = Math.max(0, Math.min(width, point.x));
  const clampedY = Math.max(0, Math.min(height, point.y));

  const lng = (clampedX / width) * 360 - 180;
  const lat = 90 - (clampedY / height) * 180;

  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}

/**
 * Generates an SVG path connecting memory pins chronologically as an intimate journey trail.
 */
export function calculateJourneyPath(
  pins: MapMemoryPin[],
  width = 1000,
  height = 500,
): string {
  if (pins.length < 2) return '';

  const sorted = [...pins].sort(
    (a, b) => new Date(a.occurredOn).getTime() - new Date(b.occurredOn).getTime(),
  );

  const points = sorted.map((p) =>
    projectEquirectangular({ lat: p.lat, lng: p.lng }, width, height),
  );

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!pt) continue;

    if (i === 0) {
      d += `M ${pt.x},${pt.y}`;
    } else {
      const prev = points[i - 1];
      if (!prev) continue;

      // Subtle arc for visual romance
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (prev.x + pt.x) / 2;
      const midY = (prev.y + pt.y) / 2 - Math.min(dist * 0.15, 30);

      d += ` Q ${midX.toFixed(1)},${midY.toFixed(1)} ${pt.x},${pt.y}`;
    }
  }

  return d;
}
