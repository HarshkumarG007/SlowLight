import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  author_id: uuid('author_id').notNull(),
  sealed_text: text('sealed_text'),
  created_at: timestamp('created_at').defaultNow().notNull()
});
