import { describe, it, expect, beforeAll, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { mapRoutes } from './map.routes.js';
import { setKeyRingForTesting } from '../crypto/keyring.js';
import { seal, type KeyRing } from '../crypto/sealed.js';

interface MockMemoryRow {
  id: string;
  title: string;
  occurredOn: string;
  emotion?: string | null;
  significance: number;
  locationId: string | null;
}

interface MockLocationRow {
  id: string;
  labelSealed: string;
  coordsSealed: string | null;
  precision: 'exact' | 'area' | 'city' | 'country' | 'hidden';
}

let mockMemories: MockMemoryRow[] = [];
let mockLocations: MockLocationRow[] = [];
let mockActorResolves: boolean = true;

vi.mock('../db/index.js', () => ({
  withActor: vi.fn(async (_role: string, _userId: string, callback: (tx: unknown) => Promise<unknown>) => {
    const mockTx = {
      select: vi.fn((fields?: unknown) => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => {
            // Distinguish memories vs locations table query
            if (fields && typeof fields === 'object' && 'locationId' in (fields as Record<string, unknown>)) {
              return mockMemories.filter((m) => m.locationId !== null);
            }
            return mockLocations;
          }),
        })),
      })),
    };
    return callback(mockTx);
  }),
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => (mockActorResolves ? [{ role: 'recipient', id: 'u1' }] : [])),
      })),
    })),
  },
}));

vi.mock('../auth/sessions.js', () => ({
  verifySession: vi.fn(async () => {
    if (!mockActorResolves) return null;
    return { userId: 'u1', id: 's1' };
  }),
}));

describe('Map API & Geographic Privacy (T12.5)', () => {
  let app: FastifyInstance;
  let ring: KeyRing;

  beforeAll(async () => {
    ring = {
      activeKid: 'map-unit-test-dek',
      key: () => Buffer.alloc(32, 7),
    };
    setKeyRingForTesting(ring);

    app = fastify();
    await app.register(cookie);
    await app.register(mapRoutes);
    await app.ready();
  });

  it('returns empty pins and journeyPath when no memories have locations', async () => {
    mockMemories = [];
    mockLocations = [];
    mockActorResolves = true;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/map',
      cookies: { '__Host-sl_sid': 'valid-sid' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.pins).toEqual([]);
    expect(body.data.journeyPath).toBe('');
  });

  it('returns coarsened coordinates and excludes hidden locations', async () => {
    mockActorResolves = true;
    mockMemories = [
      {
        id: 'mem-1',
        title: 'Morning by the Seine',
        occurredOn: '2024-04-12',
        emotion: 'tender',
        significance: 4,
        locationId: 'loc-1',
      },
      {
        id: 'mem-2',
        title: 'Secret Lookout',
        occurredOn: '2024-05-01',
        emotion: 'quiet',
        significance: 3,
        locationId: 'loc-hidden',
      },
    ];

    mockLocations = [
      {
        id: 'loc-1',
        labelSealed: 'Paris',
        coordsSealed: '48.856614, 2.352222', // Sub-meter precision GPS
        precision: 'city', // Must be coarsened to 1 decimal place (~11 km)
      },
      {
        id: 'loc-hidden',
        labelSealed: 'Confidential Haven',
        coordsSealed: '50.1234, 10.5678',
        precision: 'hidden', // Must be filtered out
      },
    ];

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/map',
      cookies: { '__Host-sl_sid': 'valid-sid' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.pins).toHaveLength(1);

    const pin = body.data.pins[0];
    expect(pin.title).toBe('Morning by the Seine');
    expect(pin.label).toBe('Paris');
    // Coarsened coordinates: 48.856614 -> 48.9, 2.352222 -> 2.4
    expect(pin.lat).toBe(48.9);
    expect(pin.lng).toBe(2.4);
    expect(pin.precision).toBe('city');
  });

  it('unseals encrypted location labels and coordinates', async () => {
    mockActorResolves = true;
    const sealedLabel = seal('Venice Canals', { table: 'locations', column: 'label_sealed', rowId: 'loc-sealed' }, ring);
    const sealedCoords = seal('{"lat": 45.440847, "lng": 12.315515}', { table: 'locations', column: 'coords_sealed', rowId: 'loc-sealed' }, ring);

    mockMemories = [
      {
        id: 'mem-sealed',
        title: 'Venetian Twilight',
        occurredOn: '2024-09-15',
        emotion: 'awe',
        significance: 5,
        locationId: 'loc-sealed',
      },
    ];

    mockLocations = [
      {
        id: 'loc-sealed',
        labelSealed: sealedLabel,
        coordsSealed: sealedCoords,
        precision: 'area', // Coarsened to 0.5 step (~55 km)
      },
    ];

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/map',
      cookies: { '__Host-sl_sid': 'valid-sid' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.pins).toHaveLength(1);

    const pin = body.data.pins[0];
    expect(pin.label).toBe('Venice Canals');
    expect(pin.lat).toBe(45.5);
    expect(pin.lng).toBe(12.5);
  });

  it('returns 401 when actor cannot be authenticated', async () => {
    mockActorResolves = false;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/map',
      cookies: { '__Host-sl_sid': 'invalid-or-expired-token' },
    });

    expect(res.statusCode).toBe(401);
  });
});
