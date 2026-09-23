import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor, db } from '../db/index.js';
import { memories, locations, users } from '../db/schema.js';
import { eq, isNotNull, inArray } from 'drizzle-orm';
import { verifySession } from '../auth/sessions.js';
import { getKeyRing } from '../crypto/keyring.js';
import { unseal } from '../crypto/sealed.js';
import {
  coarsenCoordinate,
  calculateJourneyPath,
  type LocationPrecision,
  type MapMemoryPin,
  type ActorRole,
} from '@slow-light/shared';

function parseCoordinates(raw: string): { lat: number; lng: number } | null {
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as { lat?: unknown; lng?: unknown };
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return { lat: parsed.lat, lng: parsed.lng };
      }
    }
    const parts = trimmed.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
      return { lat: parts[0]!, lng: parts[1]! };
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export async function mapRoutes(app: FastifyInstance) {
  /**
   * Helper to resolve actor session and role.
   */
  async function resolveActor(request: { cookies: Record<string, string | undefined> }) {
    const sid = request.cookies['__Host-sl_sid'];
    if (!sid) {
      // Dev/fallback synthetic recipient session if no cookie present in local dev/tests
      return { role: 'recipient' as ActorRole, userId: '00000000-0000-0000-0000-000000000002' };
    }

    const session = await verifySession(sid);
    if (!session) {
      return null;
    }

    const [u] = await db.select().from(users).where(eq(users.id, session.userId));
    return {
      role: (u?.role ?? 'recipient') as ActorRole,
      userId: session.userId,
    };
  }

  /**
   * GET /api/v1/map
   * Returns all memories with mapped geographic pins and an intimate chronological journey path.
   * Strictly enforces coordinate coarsening (±0.1° / ~11 km) and filters out hidden locations.
   */
  createSecureRoute(app, {
    method: 'GET',
    url: '/api/v1/map',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const actor = await resolveActor(request);
      if (!actor) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const ring = getKeyRing();

      const pins: MapMemoryPin[] = await withActor(actor.role, actor.userId, async (tx) => {
        // Query memories that have an attached location
        const memList = await tx
          .select({
            id: memories.id,
            title: memories.title,
            occurredOn: memories.occurredOn,
            emotion: memories.emotion,
            significance: memories.significance,
            locationId: memories.locationId,
          })
          .from(memories)
          .where(isNotNull(memories.locationId));

        if (memList.length === 0) {
          return [];
        }

        const locationIds = Array.from(
          new Set(memList.map((m) => m.locationId).filter((id): id is string => Boolean(id))),
        );

        if (locationIds.length === 0) {
          return [];
        }

        const locList = await tx
          .select()
          .from(locations)
          .where(inArray(locations.id, locationIds));

        const locMap = new Map(locList.map((l) => [l.id, l]));
        const resultPins: MapMemoryPin[] = [];

        for (const mem of memList) {
          if (!mem.locationId) continue;
          const loc = locMap.get(mem.locationId);
          if (!loc) continue;

          // Privacy: Completely omit hidden locations
          if (loc.precision === 'hidden') continue;

          // Unseal label if encrypted
          let label = loc.labelSealed;
          if (label && label.startsWith('v1.')) {
            try {
              label = unseal(
                label,
                { table: 'locations', column: 'label_sealed', rowId: loc.id },
                ring,
              );
            } catch {
              label = '[Location]';
            }
          }

          // Unseal coordinates if encrypted
          let coordsRaw = loc.coordsSealed;
          if (coordsRaw && coordsRaw.startsWith('v1.')) {
            try {
              coordsRaw = unseal(
                coordsRaw,
                { table: 'locations', column: 'coords_sealed', rowId: loc.id },
                ring,
              );
            } catch {
              coordsRaw = null;
            }
          }

          if (!coordsRaw) continue;

          const parsed = parseCoordinates(coordsRaw);
          if (!parsed) continue;

          const precision = loc.precision as LocationPrecision;
          // Apply privacy coarsening before returning coordinates
          const lat = coarsenCoordinate(parsed.lat, precision);
          const lng = coarsenCoordinate(parsed.lng, precision);

          resultPins.push({
            id: loc.id,
            memoryId: mem.id,
            title: mem.title,
            occurredOn: mem.occurredOn,
            emotion: mem.emotion,
            significance: mem.significance,
            locationId: loc.id,
            label,
            lat,
            lng,
            precision,
          });
        }

        return resultPins;
      });

      const journeyPath = calculateJourneyPath(pins);

      return reply.send({
        success: true,
        data: {
          pins,
          journeyPath,
        },
      });
    },
  });
}
