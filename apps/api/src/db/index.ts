import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });

export async function withActor<T>(
  role: string,
  userId: string,
  cb: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = ${role}`);
    await tx.execute(sql`SET LOCAL app.user_id = ${userId}`);
    return cb(tx);
  });
}
