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
  primaryKey,
  customType,
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
