import { createHmac } from 'node:crypto';

export interface AuditEvent {
  id: string;
  action: string;
  actorId: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  previousHash: string; // The hash of the immediately preceding event
}

/**
 * Generates an HMAC-SHA256 hash for an audit event to anchor it to the previous event.
 * In a real implementation, the HMAC secret would be stored securely (e.g. KMS)
 * to prevent attackers from recalculating the chain after tampering.
 */
export function hashAuditEvent(event: AuditEvent, secret: string): string {
  const payload = JSON.stringify({
    id: event.id,
    action: event.action,
    actorId: event.actorId,
    targetId: event.targetId,
    metadata: event.metadata,
    timestamp: event.timestamp.toISOString(),
    previousHash: event.previousHash
  });

  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Stub for appending an event to the ledger.
 */
export async function appendToLedger(
  action: string,
  actorId: string,
  metadata: Record<string, unknown> = {},
  targetId?: string
): Promise<{ hash: string }> {
  // 1. Fetch the last event's hash from the database
  const previousHash = 'stub-previous-hash-0000000000000000';
  
  // 2. Construct the new event
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    action,
    actorId,
    targetId,
    metadata,
    timestamp: new Date(),
    previousHash
  };

  // 3. Hash the event
  // Assume we retrieve the anchor secret from KMS or environment
  const secret = process.env.AUDIT_ANCHOR_SECRET || 'dev-anchor-secret';
  const hash = hashAuditEvent(event, secret);

  // 4. Insert into the `audit_logs` table
  // await db.insert(audit_logs).values({ ...event, hash });
  
  return { hash };
}
