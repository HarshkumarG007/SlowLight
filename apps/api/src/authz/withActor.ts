import { sql } from 'drizzle-orm';
import type { ActorRole } from '@slow-light/shared';

export async function withActor<T>(
  tx: { execute: (query: unknown) => Promise<unknown> }, 
  actor: { role: ActorRole; userId?: string }, 
  fn: () => Promise<T>
): Promise<T> {
  // Set RLS local variables in Postgres
  await tx.execute(sql`SELECT set_config('app.role', ${actor.role}, true)`);
  if (actor.userId) {
    await tx.execute(sql`SELECT set_config('app.user_id', ${actor.userId}, true)`);
  }
  
  return await fn();
}
