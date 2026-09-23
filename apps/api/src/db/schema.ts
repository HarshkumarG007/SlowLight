import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  integer,
  smallint,
  jsonb,
  date,
  primaryKey,
  customType,
  index,
} from 'drizzle-orm/pg-core';

// bytea is not directly exported; define a custom type mapping to Buffer
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return 'bytea'; },
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role', { enum: ['author', 'recipient'] }).notNull(),
  displayNameSealed: text('display_name_sealed').notNull(),
  emailSealed: text('email_sealed'),
  status: text('status', { enum: ['pending', 'active', 'disabled'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
});

export const enrollmentInvites = pgTable('enrollment_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: bytea('token_hash').notNull().unique(),
  phraseHash: text('phrase_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  attempts: smallint('attempts').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: bytea('credential_id').notNull().unique(),
  publicKey: bytea('public_key').notNull(),
  signCount: bigint('sign_count', { mode: 'number' }).notNull().default(0),
  transports: text('transports').array().notNull().default([]),
  aaguid: uuid('aaguid'),
  backedUp: boolean('backed_up').notNull().default(false),
  label: text('label').notNull().default('Passkey'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedReason: text('revoked_reason'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: uuid('credential_id').references(() => credentials.id, { onDelete: 'set null' }),
  tokenHash: bytea('token_hash').notNull().unique(),
  kind: text('kind', { enum: ['standard', 'ephemeral'] }).notNull().default('standard'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  idleExpiresAt: timestamp('idle_expires_at', { withTimezone: true }).notNull(),
  absoluteExpiresAt: timestamp('absolute_expires_at', { withTimezone: true }).notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }).notNull().defaultNow(),
  elevatedUntil: timestamp('elevated_until', { withTimezone: true }),
  knockState: text('knock_state', { enum: ['none', 'pending', 'passed'] }).notNull().default('none'),
  uaSummary: text('ua_summary'),
  ipPrefix: text('ip_prefix'),
  country: text('country'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedReason: text('revoked_reason'),
});

export const knockCodes = pgTable('knock_codes', {
  sessionId: uuid('session_id').primaryKey().references(() => sessions.id, { onDelete: 'cascade' }),
  codeHash: bytea('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: smallint('attempts').notNull().default(0),
});

export const authChallenges = pgTable('auth_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  purpose: text('purpose', { enum: ['login', 'enroll', 'add_credential', 'step_up'] }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  challenge: bytea('challenge').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recoveryCodes = pgTable('recovery_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.key, t.windowStart] }) }),
);

// ===== Crypto =====

export const keyRegistry = pgTable('key_registry', {
  kid: text('kid').primaryKey(),
  purpose: text('purpose').notNull().default('sealed'),
  wrappedDek: bytea('wrapped_dek').notNull(),
  kmsKeyId: text('kms_key_id').notNull(),
  status: text('status', { enum: ['active', 'retired'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
});

// ===== Media =====

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind', { enum: ['image', 'video', 'audio'] }).notNull(),
  status: text('status', {
    enum: ['uploading', 'processing', 'ready', 'failed', 'quarantined'],
  })
    .notNull()
    .default('uploading'),
  mimeDetected: text('mime_detected'),
  bytes: bigint('bytes', { mode: 'number' }),
  checksumSha256: bytea('checksum_sha256'),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  lqip: text('lqip'),          // tiny inline base64 placeholder ≤ 2 KB
  altSealed: text('alt_sealed'),
  variants: jsonb('variants').notNull().default([]),
  vaultKey: text('vault_key'), // original in vault bucket; never served
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  errorCode: text('error_code'),
  uploaderId: uuid('uploader_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const memoryAssets = pgTable(
  'memory_assets',
  {
    memoryId: uuid('memory_id').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    captionSealed: text('caption_sealed'),
    isCover: boolean('is_cover').notNull().default(false),
  },
  (t) => ({ pk: primaryKey({ columns: [t.memoryId, t.assetId] }) }),
);

export const letterAssets = pgTable(
  'letter_assets',
  {
    letterId: uuid('letter_id').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.letterId, t.assetId] }) }),
);

export const siteTexts = pgTable('site_texts', {
  key: text('key').primaryKey(),
  valueSealed: text('value_sealed').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userState = pgTable('user_state', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  lastSeenWorldAt: timestamp('last_seen_world_at', { withTimezone: true }),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  introSealed: text('intro_sealed'),
  ambienceKey: text('ambience_key'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  labelSealed: text('label_sealed').notNull(),
  coordsSealed: text('coords_sealed'),
  precision: text('precision', { enum: ['exact', 'area', 'city', 'country', 'hidden'] }).notNull().default('city'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
});

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  storySealed: text('story_sealed'),
  kind: text('kind', { enum: ['moment', 'milestone', 'trip', 'conversation', 'ritual', 'gift'] }).notNull().default('moment'),
  significance: smallint('significance').notNull().default(2),
  emotion: text('emotion', { enum: ['tender', 'joyful', 'quiet', 'bittersweet', 'awe', 'playful'] }),
  occurredOn: date('occurred_on').notNull(),
  datePrecision: text('date_precision', { enum: ['day', 'month', 'year', 'approx'] }).notNull().default('day'),
  recurrence: text('recurrence', { enum: ['none', 'yearly'] }).notNull().default('none'),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  layoutHint: jsonb('layout_hint'),
  status: text('status', { enum: ['draft', 'scheduled', 'published', 'archived'] }).notNull().default('draft'),
  publishAt: timestamp('publish_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  chapterIdx: index('memories_chapter_idx').on(t.chapterId),
  statusIdx: index('memories_status_idx').on(t.status),
  occurredOnIdx: index('memories_occurred_on_idx').on(t.occurredOn),
}));

export const memoryTags = pgTable('memory_tags', {
  memoryId: uuid('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.memoryId, t.tagId] }) }));

export const letters = pgTable('letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  unlockMode: text('unlock_mode', { enum: ['open', 'timed', 'held'] }).notNull().default('open'),
  unlockAt: timestamp('unlock_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  sealCeremony: boolean('seal_ceremony').notNull().default(false),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  chapterIdx: index('letters_chapter_idx').on(t.chapterId),
  statusIdx: index('letters_status_idx').on(t.status),
}));

export const letterBodies = pgTable('letter_bodies', {
  letterId: uuid('letter_id').primaryKey().references(() => letters.id, { onDelete: 'cascade' }),
  bodySealed: text('body_sealed').notNull(),
});

export const futureEntries = pgTable('future_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind', { enum: ['promise', 'place', 'plan', 'dream', 'blank'] }).notNull(),
  title: text('title').notNull(),
  noteSealed: text('note_sealed'),
  targetDate: date('target_date'),
  targetPrecision: text('target_precision', { enum: ['day', 'month', 'year', 'approx'] }).notNull().default('year'),
  status: text('status', { enum: ['draft', 'unlit', 'arrived', 'archived'] }).notNull().default('draft'),
  arrivedMemoryId: uuid('arrived_memory_id').references(() => memories.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('future_entries_status_idx').on(t.status),
  targetDateIdx: index('future_entries_target_date_idx').on(t.targetDate),
}));

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  memoryId: uuid('memory_id').references(() => memories.id, { onDelete: 'cascade' }),
  letterId: uuid('letter_id').references(() => letters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const replies = pgTable('replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type', { enum: ['memory', 'letter'] }).notNull(),
  targetId: uuid('target_id').notNull(),
  bodySealed: text('body_sealed').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  targetIdx: index('replies_target_idx').on(t.targetType, t.targetId),
  userIdIdx: index('replies_user_id_idx').on(t.userId),
}));

export const deviceSessions = pgTable('device_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  devicePublicKey: text('device_public_key').notNull(),
  algorithm: text('algorithm').notNull().default('ES256'),
  lastProofAt: timestamp('last_proof_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sessionIdIdx: index('device_sessions_session_id_idx').on(t.sessionId),
}));


